import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import Sidebar from "../components/Sidebar";

const VisitHistory = () => {
  const { patientId } = useParams();
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId && patientId) fetchSessions();
  }, [userId, patientId]);

  const fetchSessions = async () => {
    const q = query(
      collection(db, "users", userId, "patients", patientId, "sessions"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const sessionList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    setSessions(sessionList);
  };

  const handleAddSession = async () => {
    const newSessionRef = await addDoc(
      collection(db, "users", userId, "patients", patientId, "sessions"),
      {
        createdAt: serverTimestamp(),
      }
    );
    navigate(`/session/${patientId}/${newSessionRef.id}`);
  };

  const handleDeleteSession = async (sessionId) => {
    await deleteDoc(
      doc(db, "users", userId, "patients", patientId, "sessions", sessionId)
    );
    fetchSessions();
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-8">
        <h2 className="text-4xl font-bold mb-6 text-center text-blue-800">
          Visit History
        </h2>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleAddSession}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded shadow"
          >
            + Start New Session
          </button>
        </div>

        <div className="w-full bg-white rounded-lg shadow-md overflow-hidden border border-gray-300 max-w-4xl mx-auto">
          <div className="bg-blue-700 text-white font-semibold flex px-6 py-3 text-sm tracking-wide">
            <div className="flex-1">Entry</div>
            <div className="w-32">Date</div>
            <div className="w-24 text-center">Time</div>
            <div className="w-8 text-center">✕</div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-200">
            {sessions.map((session) => {
              const date = session.createdAt?.toDate().toLocaleDateString() ?? "—";
              const time = session.createdAt?.toDate().toLocaleTimeString() ?? "—";

              return (
                <div
                  key={session.id}
                  className="flex px-6 py-3 hover:bg-gray-100 transition cursor-pointer"
                >
                  <div className="flex-1" onClick={() => navigate(`/session/${patientId}/${session.id}`)}>
                    Session #{session.id.slice(-4)}
                  </div>
                  <div className="w-32">{date}</div>
                  <div className="w-24 text-center">{time}</div>
                  <div
                    className="w-8 text-center text-red-500 font-bold hover:text-red-700"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    ✕
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitHistory;
