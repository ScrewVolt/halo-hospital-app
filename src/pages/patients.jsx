import { useEffect, useState, useRef } from "react"
import { useOutletContext } from "react-router-dom"
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc
} from "firebase/firestore"
import { auth, db } from "../firebase"
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
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState("")
  const [nursingChart, setNursingChart] = useState("")
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState("")
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingValue, setEditingValue] = useState("")

  const user = auth.currentUser
  const exportRef = useRef(null)
  const recognitionRef = useRef(null)
  const shouldRestartRef = useRef(false)

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
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setMessages(data)
    })

    return () => unsub()
  }, [selectedPatient, user])

  useEffect(() => {
    if (selectedPatient?.summary) setSummary(selectedPatient.summary)
    else setSummary("")

    if (selectedPatient?.nursingChart) setNursingChart(selectedPatient.nursingChart)
    else setNursingChart("")
  }, [selectedPatient])

  const handleSend = async (text) => {
    const content = text || chatInput
    if (!content.trim() || !selectedPatient || !user) return

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

  const tagSpeaker = (text) => {
    const lower = text.toLowerCase()
    if (lower.startsWith("nurse")) {
      return `Nurse: ${text.replace(/^nurse\s*/i, "")}`
    }
    if (lower.startsWith("patient")) {
      return `Patient: ${text.replace(/^patient\s*/i, "")}`
    }
    return `Unspecified: ${text}`
  }

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert("Speech recognition not supported.")

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognitionRef.current = recognition
    shouldRestartRef.current = true
    setRecognizing(true)

    let sessionTranscript = ""

    recognition.onresult = (event) => {
      let interim = ""

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim()
        if (event.results[i].isFinal) {
          sessionTranscript += " " + transcript
        } else {
          interim = transcript
        }
      }

      setLiveTranscript(interim)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
    }

    recognition.onend = () => {
      if (sessionTranscript.trim()) {
        const tagged = tagSpeaker(sessionTranscript.trim())
        handleSend(tagged)
      }

      setLiveTranscript("")
      sessionTranscript = ""

      if (shouldRestartRef.current) {
        console.log("🎤 Restarting recognition (Android)")
        startRecognition()
      }
    }

    recognition.start()
  }

  const stopRecognition = () => {
    shouldRestartRef.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setRecognizing(false)
    setLiveTranscript("")
  }

  const handleEditStart = (msg) => {
    setEditingMessageId(msg.id)
    setEditingValue(msg.text)
  }

  const handleEditSave = async () => {
    if (!editingValue.trim() || !user || !selectedPatient) return

    const msgRef = doc(
      db,
      "users",
      user.uid,
      "patients",
      selectedPatient.id,
      "messages",
      editingMessageId
    )

    await updateDoc(msgRef, {
      text: editingValue
    })

    setEditingMessageId(null)
    setEditingValue("")
  }

  const handleGenerateSummary = async () => {
    if (!messages.length || !user || !selectedPatient) return;
  
    setLoadingSummary(true);
  
    const chatText = messages.map((m) => m.text).join("\n");
  
    const prompt = `
  You are a clinical assistant summarizing a medical interaction between a nurse and a patient.
  
  Conversation:
  ---
  ${chatText}
  ---
  
  Instructions:
  1. Identify symptoms, medications, actions taken, and any responses or concerns.
  2. Focus on key medical terms like "pain", "medication", "blood pressure", "vomiting", "history", "follow-up", etc.
  3. Provide a concise and clinically useful **Summary**.
  4. Create a structured **Nursing Chart** using this format:
  
  - Assessment:
  - Diagnosis:
  - Plan:
  - Interventions:
  - Evaluation:
  
  Ensure accuracy and clarity in professional tone.
  `;
  
    try {
      const response = await fetch("https://halo-backend-rrpc.onrender.com/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map((m) => m.text).join("\n"), // 🔁 Use `messages`, not `chat`
        }),
      });      
  
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const data = await response.json();
      const summaryResult = data.summary;
  
      if (!summaryResult) {
        alert("❌ AI did not return a summary.");
        return;
      }
      const summaryMatch = summaryResult.match(/\*\*Summary:\*\*(.*?)\*\*Nursing Chart:\*\*/s)
      const chartMatch = summaryResult.match(/\*\*Nursing Chart:\*\*(.*)/s)

      const summaryPart = summaryMatch ? summaryMatch[1].trim() : ""
      const chartPart = chartMatch ? chartMatch[1].trim() : ""

      setSummary(summaryPart)
      setNursingChart(chartPart)
  
      const patientRef = doc(
        db,
        "users",
        user.uid,
        "patients",
        selectedPatient.id
      );
  
      await updateDoc(patientRef, {
        summary: summaryPart,
        nursingChart: chartPart,
      });
  
      alert("✅ Summary and Nursing Chart saved.");
    } catch (err) {
      console.error("❌ Summary generation failed:", err);
      alert("❌ Summary generation failed.");
    } finally {
      setLoadingSummary(false);
    }
  };  

  const handleExport = async () => {
    if (!exportRef.current) return

    const element = exportRef.current
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#fff" })
    const imgData = canvas.toDataURL("image/png")

    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
    const imgWidth = canvas.width * ratio
    const imgHeight = canvas.height * ratio

    pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight)
    pdf.save(`${selectedPatient.name}_Report.pdf`)
  }

  return (
    <div className="flex flex-col h-full bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Chatroom</h2>

      {!selectedPatient ? (
        <div className="flex-1 text-gray-500 flex items-center justify-center">
          Select a patient from the sidebar to view their chatroom.
        </div>
      ) : (
        <>
          <div className="flex-1 border bg-gray-50 p-4 overflow-y-auto rounded">
            {messages.map((msg) => (
              <div key={msg.id} className="mb-2">
                {editingMessageId === msg.id ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave()
                    }}
                    className="w-full p-1 border rounded"
                    autoFocus
                  />
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => handleEditStart(msg)}
                    dangerouslySetInnerHTML={{ __html: highlightKeywords(msg.text) }}
                  />
                )}
              </div>
            ))}
            {recognizing && (
              <div className="text-xs text-blue-500 italic mt-1 animate-pulse">
                🎤 Listening... (tap Stop to end)
                {liveTranscript && (
                  <span
                    className="block italic text-gray-500"
                    dangerouslySetInnerHTML={{ __html: highlightKeywords(liveTranscript) }}
                  />
                )}
              </div>
            )}
            <div/>
          </div>

          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={`Chat with ${selectedPatient.name}`}
            className="mt-4 border p-2 rounded w-full"
          />

          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => handleSend()} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
              Send
            </button>
            <button onClick={startRecognition} disabled={recognizing} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
              Start Recognition
            </button>
            <button onClick={stopRecognition} disabled={!recognizing} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
              Stop Recognition
            </button>
            <button onClick={handleExport} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded">
              Export
            </button>
            <button
              onClick={handleGenerateSummary}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={loadingSummary}
            >
              {loadingSummary ? "Generating..." : "Generate Summary"}
            </button>
          </div>

          <div ref={exportRef} className="mt-8 text-sm leading-relaxed p-4 max-w-3xl mx-auto bg-white text-black">
            <h2 className="text-xl font-bold mb-2">{selectedPatient.name} – Patient Report</h2>
            <hr className="my-3 border-gray-300" />

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Chat Transcript</h3>
            <pre className="whitespace-pre-wrap mb-4">
              {messages.map((m) => m.text).join("\n")}
            </pre>

            {summary && (
              <>
                <h3 className="text-lg font-semibold text-blue-700 mt-4 mb-2">AI Summary</h3>
                <pre className="whitespace-pre-wrap mb-4 text-gray-800">{summary}</pre>
              </>
            )}

            {nursingChart && (
              <>
                <h3 className="text-lg font-semibold text-purple-700 mt-4 mb-2">Nursing Chart</h3>
                <pre className="whitespace-pre-wrap text-gray-800">{nursingChart}</pre>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
