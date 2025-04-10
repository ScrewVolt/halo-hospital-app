import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import Sidebar from "../components/Sidebar";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { marked } from "marked";


const highlightKeywords = (text) => {
    if (!text) return "";
  
    const keywords = {
      pain: "text-red-600 font-semibold",
      medication: "text-indigo-600 font-semibold",
      blood: "text-blue-700 font-semibold",
      pressure: "text-blue-700 font-semibold",
      vomiting: "text-orange-600 font-semibold",
      history: "text-green-600 font-semibold",
      follow: "text-green-600 font-semibold",
      Data: "text-blue-600 font-semibold",
      Action: "text-green-600 font-semibold",
      Response: "text-orange-600 font-semibold",
    };
  
    const pattern = new RegExp(
      `\\b(${Object.keys(keywords).join("|")})\\b`,
      "gi"
    );
  
    return text.replace(pattern, (match) => {
      const className = keywords[match.toLowerCase()] || "bg-yellow-200";
      return `<span class="${className}">${match}</span>`;
    });
  };
  

export default function SessionEntry() {
  const { patientId, sessionId } = useParams();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [nursingChart, setNursingChart] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [patientName, setPatientName] = useState("Patient");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [lastUsedAt, setLastUsedAt] = useState(null);



  const user = auth.currentUser;
  const exportRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    if (!user || !patientId || !sessionId) return;

    const messagesRef = collection(
      db,
      "users",
      user.uid,
      "patients",
      patientId,
      "sessions",
      sessionId,
      "messages"
    );

    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(data);
    });

    return () => unsub();
  }, [user, patientId, sessionId]);

  useEffect(() => {
    const loadSessionData = async () => {
      const sessionRef = doc(
        db,
        "users",
        user.uid,
        "patients",
        patientId,
        "sessions",
        sessionId
      );
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data() || {};
  
      setSummary(sessionData.summary || "");
      setNursingChart(sessionData.nursingChart || "");
      setGeneratedAt(sessionData.generatedAt || null); // ✅ add this
      setStartedAt(sessionData.startedAt || null);
      setLastUsedAt(sessionData.lastUsedAt || null);

    };
  
    if (user && patientId && sessionId) {
      loadSessionData();
    }
  }, [user, patientId, sessionId]);
  

  const handleSend = async (text) => {
    const content = text || chatInput;
    if (!content.trim()) return;

    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
    const fullMessage = `[${timestamp}] ${content}`;

    await addDoc(
      collection(
        db,
        "users",
        user.uid,
        "patients",
        patientId,
        "sessions",
        sessionId,
        "messages"
      ),
      {
        text: fullMessage,
        timestamp: new Date(),
      }
    );

    setChatInput("");
    setLiveTranscript("");
  };

  const tagSpeaker = (text) => {
    const lower = text.toLowerCase();
    if (lower.startsWith("nurse")) return `Nurse: ${text.replace(/^nurse\s*/i, "")}`;
    if (lower.startsWith("patient")) return `Patient: ${text.replace(/^patient\s*/i, "")}`;
    return `Unspecified: ${text}`;
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition not supported.");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    setRecognizing(true);

    let sessionTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          sessionTranscript += " " + transcript;
        } else {
          interim = transcript;
        }
      }

      setLiveTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      if (sessionTranscript.trim()) {
        const tagged = tagSpeaker(sessionTranscript.trim());
        handleSend(tagged);
      }

      setLiveTranscript("");
      sessionTranscript = "";

      if (shouldRestartRef.current) {
        startRecognition();
      }
    };

    recognition.start();
  };

  const stopRecognition = () => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecognizing(false);
    setLiveTranscript("");
  };

  const handleEditStart = (msg) => {
    setEditingMessageId(msg.id);
    setEditingValue(msg.text);
  };

  const handleEditSave = async () => {
    if (!editingValue.trim()) return;

    const msgRef = doc(
      db,
      "users",
      user.uid,
      "patients",
      patientId,
      "sessions",
      sessionId,
      "messages",
      editingMessageId
    );

    await updateDoc(msgRef, { text: editingValue });
    setEditingMessageId(null);
    setEditingValue("");
  };

  const handleGenerateSummary = async () => {
    if (!messages.length) return;
  
    setLoadingSummary(true);
  
    const chatText = messages.map((m) => m.text).join("\n");
  
    try {
      const response = await fetch("https://halo-backend-rrpc.onrender.com/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatText }), // ✅ Send only the message text
      });
  
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      const data = await response.json();
  
      if (!data.summary) throw new Error("No summary returned from backend");
  
      // ✅ Use the backend’s exact structure
      const summaryMatch = data.summary.match(/\*\*Summary:\*\*(.*?)\*\*Nursing Chart:\*\*/s);
      const chartMatch = data.summary.match(/\*\*Nursing Chart:\*\*(.*)/s);
  
      const summaryPart = summaryMatch ? summaryMatch[1].trim() : "";
      const chartPart = chartMatch ? chartMatch[1].trim() : "";
  
      setSummary(summaryPart);
      setNursingChart(chartPart);
  
      const sessionRef = doc(
        db,
        "users",
        user.uid,
        "patients",
        patientId,
        "sessions",
        sessionId
      );
  
      const timestamp = new Date().toISOString();

    await updateDoc(sessionRef, {
    summary: summaryPart,
    nursingChart: chartPart,
    generatedAt: timestamp, // 🕒 Save it
    });


      setSummary(summaryPart);
      setNursingChart(chartPart);
  
      alert("✅ Summary and Nursing Chart saved.");
    } catch (err) {
      console.error("❌ Summary generation failed:", err);
      alert("❌ Summary generation failed. Please check the console or try again.");
    } finally {
      setLoadingSummary(false);
    }
  };
  

  const handleExport = async () => {
    if (!exportRef.current) return;
  
    // ✅ Delay slightly to ensure DOM is fully rendered
    await new Promise((resolve) => setTimeout(resolve, 250));
  
    try {
      const element = exportRef.current;
  
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true, // optional but helps with font/image loading
        backgroundColor: "#fff",
      });
  
      const imgData = canvas.toDataURL("image/png");
  
      if (!imgData || imgData.length < 50) {
        throw new Error("Empty or invalid image data");
      }
  
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
  
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
  
      pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
      pdf.save(`${patientName}_Report.pdf`);
    } catch (err) {
      console.error("❌ Export failed:", err);
      alert("Export failed. Make sure the report section is visible and fully loaded.");
    }
  };
  

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-center text-blue-800 mb-6">
          Session with {patientName}
        </h2>

        <div className="bg-white rounded p-6 shadow max-w-4xl mx-auto">
          <div className="max-h-[400px] overflow-y-auto border p-4 bg-gray-50 rounded">
            {messages.map((msg) => (
              <div key={msg.id} className="mb-2">
                {editingMessageId === msg.id ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
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
          </div>

          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={`Chat with ${patientName}`}
            className="mt-4 border p-2 rounded w-full"
          />

          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => handleSend()} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Send
            </button>
            <button onClick={startRecognition} disabled={recognizing} className="bg-blue-600 text-white px-4 py-2 rounded">
              Start Recognition
            </button>
            <button onClick={stopRecognition} disabled={!recognizing} className="bg-red-600 text-white px-4 py-2 rounded">
              Stop Recognition
            </button>
            <button
  onClick={handleExport}
  disabled={!summary && !nursingChart}
  className={`px-4 py-2 rounded text-white ${
    summary || nursingChart
      ? "bg-indigo-500 hover:bg-indigo-600"
      : "bg-gray-400 cursor-not-allowed"
  }`}
>
  Export PDF
</button>

            <button
              onClick={handleGenerateSummary}
              disabled={loadingSummary}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              {loadingSummary ? "Generating..." : "Generate Summary"}
            </button>
          </div>
          {(startedAt || lastUsedAt) && (
  <div className="text-sm text-gray-500 mb-4 space-y-1 italic">
    {startedAt && (
      <p>Session started: {new Date(startedAt).toLocaleString()}</p>
    )}
    {lastUsedAt && (
      <p>Last updated: {new Date(lastUsedAt).toLocaleString()}</p>
    )}
  </div>
)}

          <div ref={exportRef} className="mt-8">
            {summary && (
              <>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">AI Summary</h3>
                <div
  className="text-gray-700 prose prose-sm max-w-none mb-4"
  dangerouslySetInnerHTML={{ __html: marked.parse(summary) }}
/>

              </>
            )}
{nursingChart && (
  <>
    <h3 className="text-lg font-semibold text-purple-700 mt-4 mb-4">Nursing Chart</h3>
    {generatedAt && (
      <p className="text-sm text-gray-500 mb-3 italic">
        Generated on: {new Date(generatedAt).toLocaleString()}
      </p>
    )}
    <div className="space-y-4">
      {["Assessment", "Diagnosis", "Plan", "Interventions", "Evaluation"].map((section) => {
        const regex = new RegExp(`\\*\\*${section}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
        const match = nursingChart.match(regex);
        const content = match ? match[1].trim() : "";

        return content ? (
          <div key={section} className="border border-purple-300 rounded-xl p-4 bg-purple-50 shadow-sm">
            <h4 className="text-md font-semibold text-purple-800 mb-2">{section}</h4>
            <div
              className="text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
            />
          </div>
        ) : null;
      })}
    </div>
  </>
)}



          </div>
        </div>
      </div>
    </div>
  );
}
