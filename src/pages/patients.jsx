// ✅ Polished Patients.jsx with fixed hook order and sidebar style
import { useEffect, useState, useRef } from "react"
import { useOutletContext } from "react-router-dom"
import { useAuth } from "../authContext"
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore"
import { db } from "../firebase"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

const highlightKeywords = (text) => {
  return text
    .replace(/Data/gi, '<span class="text-blue-600 font-semibold">Data</span>')
    .replace(/Action/gi, '<span class="text-green-600 font-semibold">Action</span>')
    .replace(/Response/gi, '<span class="text-orange-600 font-semibold">Response</span>')
}

export default function Patients() {
  const { selectedPatient } = useOutletContext()
  const { user } = useAuth()

  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState("")
  const [nursingChart, setNursingChart] = useState("")
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState("")
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingValue, setEditingValue] = useState("")

  const exportRef = useRef(null)
  const recognitionRef = useRef(null)
  const silenceTimer = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!selectedPatient || !user) return

    const messagesRef = collection(
      db,
      "users",
      user.uid,
      "patients",
      selectedPatient.id,
      "messages"
    )

    const q = query(messagesRef, orderBy("timestamp", "asc"))
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setMessages(data)
    })

    return () => unsub()
  }, [selectedPatient, user])

  useEffect(() => {
    setSummary(selectedPatient?.summary || "")
    setNursingChart(selectedPatient?.nursingChart || "")
  }, [selectedPatient])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, liveTranscript])

  const handleSend = async (text) => {
    const content = text || chatInput
    if (!content.trim()) return

    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC"
    const fullMessage = `[${timestamp}] ${content}`

    const messageRef = collection(
      db,
      "users",
      user.uid,
      "patients",
      selectedPatient.id,
      "messages"
    )

    await addDoc(messageRef, {
      text: fullMessage,
      timestamp: new Date()
    })

    setChatInput("")
    setLiveTranscript("")
  }

  const handleEditStart = (msg) => {
    setEditingMessageId(msg.id)
    setEditingValue(msg.text)
  }

  const handleEditSave = async () => {
    const msgRef = doc(
      db,
      "users",
      user.uid,
      "patients",
      selectedPatient.id,
      "messages",
      editingMessageId
    )
    await updateDoc(msgRef, { text: editingValue })
    setEditingMessageId(null)
    setEditingValue("")
  }

  const tagSpeaker = (text) => {
    const lower = text.toLowerCase()
    if (lower.startsWith("nurse")) return `Nurse: ${text.replace(/^nurse\s*/i, "")}`
    if (lower.startsWith("patient")) return `Patient: ${text.replace(/^patient\s*/i, "")}`
    return `Unspecified: ${text}`
  }

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert("Speech recognition not supported.")

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognitionRef.current = recognition
    setRecognizing(true)

    recognition.onresult = (event) => {
      let finalTranscript = ""
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim()
        if (event.results[i].isFinal) finalTranscript += transcript + " "
        else setLiveTranscript(transcript)
      }

      if (silenceTimer.current) clearTimeout(silenceTimer.current)
      silenceTimer.current = setTimeout(() => {
        if (finalTranscript.trim()) {
          const speakerTagged = tagSpeaker(finalTranscript.trim())
          handleSend(speakerTagged)
        }
        setLiveTranscript("")
      }, 1500)
    }

    recognition.onerror = (event) => console.error("Speech recognition error:", event.error)
    recognition.onend = () => {
      setRecognizing(false)
      setLiveTranscript("")
    }

    recognition.start()
  }

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setRecognizing(false)
      setLiveTranscript("")
    }
  }

  const handleGenerateSummary = async () => {
    if (!messages.length) return
    setLoadingSummary(true)

    const chatText = messages.map((m) => m.text).join("\n")
    const prompt = `You are a clinical assistant...\nConversation:\n${chatText}`

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      })
      const data = await res.json()
      const result = data.choices?.[0]?.message?.content
      if (result) {
        setSummary(result)
        setNursingChart(result)
        await updateDoc(doc(db, "users", user.uid, "patients", selectedPatient.id), {
          summary: result,
          nursingChart: result
        })
        alert("Summary and Nursing Chart saved.")
      } else alert("No summary returned.")
    } catch (err) {
      console.error(err)
      alert("Failed to generate summary.")
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleExport = async () => {
    const element = exportRef.current
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#fff" })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" })
    const ratio = Math.min(pdf.internal.pageSize.getWidth() / canvas.width, pdf.internal.pageSize.getHeight() / canvas.height)
    pdf.addImage(imgData, "PNG", 20, 20, canvas.width * ratio, canvas.height * ratio)
    pdf.save(`${selectedPatient.name}_Report.pdf`)
  }

  if (!selectedPatient || !user) {
    return (
      <div className="text-gray-500 h-full flex items-center justify-center">
        Loading chatroom...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 p-6 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Patient Chart</h2>

      <div className="flex-1 border bg-white p-4 rounded-lg shadow-inner overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-3">
            {editingMessageId === msg.id ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={handleEditSave}
                onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                className="w-full p-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            ) : (
              <div
                className="cursor-pointer text-sm whitespace-pre-wrap text-gray-800 px-2 py-1 rounded-md hover:bg-blue-50"
                onClick={() => handleEditStart(msg)}
                dangerouslySetInnerHTML={{ __html: highlightKeywords(msg.text) }}
              />
            )}
          </div>
        ))}
        {recognizing && liveTranscript && (
          <div
            className="text-gray-400 italic px-2 py-1"
            dangerouslySetInnerHTML={{ __html: `🎙 ${highlightKeywords(liveTranscript)}...` }}
          />
        )}
        <div ref={scrollRef} />
      </div>

      <input
        type="text"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        placeholder={`Chat with ${selectedPatient.name}`}
        className="mt-4 border border-gray-300 p-3 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
      />

      <div className="flex gap-2 mt-4 flex-wrap">
        <button onClick={() => handleSend()} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow">
          Send
        </button>
        <button onClick={startRecognition} disabled={recognizing} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow disabled:opacity-50">
          Start Recognition
        </button>
        <button onClick={stopRecognition} disabled={!recognizing} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md shadow disabled:opacity-50">
          Stop
        </button>
        <button onClick={handleExport} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md shadow">
          Export
        </button>
        <button onClick={handleGenerateSummary} disabled={loadingSummary} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow disabled:opacity-50">
          {loadingSummary ? "Generating..." : "Generate Summary"}
        </button>
      </div>

      <div ref={exportRef} className="mt-10 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold mb-3 text-gray-800">{selectedPatient.name} – Patient Report</h2>
        <hr className="my-3 border-gray-300" />
        <h3 className="text-md font-semibold text-blue-700 mb-2">Chat Transcript</h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 mb-4">{messages.map((m) => m.text).join("\n")}</pre>
        {summary && (
          <>
            <h3 className="text-md font-semibold text-green-700 mb-2">AI Summary</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 mb-4">{summary}</pre>
          </>
        )}
        {nursingChart && (
          <>
            <h3 className="text-md font-semibold text-purple-700 mb-2">Nursing Chart</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700">{nursingChart}</pre>
          </>
        )}
      </div>
    </div>
  )
}