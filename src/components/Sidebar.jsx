import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const Sidebar = ({ patients = [], onSearch, onAddPatient, selectedPatient }) => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (onAddPatient) onAddPatient(query, room);
    setQuery("");
    setRoom("");
  };

  useEffect(() => {
    console.log("🧠 selectedPatient in Sidebar:", selectedPatient);

    if (!selectedPatient) {
      setNotes(""); // Clear notes if no patient is selected
      return;
    }

    const fetchNotes = async () => {
      if (!auth.currentUser) return;
      const ref = doc(db, "users", auth.currentUser.uid, "patients", selectedPatient.id);
      const snap = await getDoc(ref);
      setNotes(snap.data()?.notes || "");
    };

    fetchNotes();
  }, [selectedPatient]);

  const handleSaveNotes = async (val) => {
    setNotes(val);
    if (!selectedPatient?.id || !auth.currentUser) return;
    const ref = doc(db, "users", auth.currentUser.uid, "patients", selectedPatient.id);
    await updateDoc(ref, { notes: val });
  };

  return (
    <div className="bg-blue-700 text-white w-64 min-h-screen flex flex-col justify-between py-6 px-4">
      <div className="flex flex-col items-center gap-6">
        <h1
          className="text-3xl font-bold cursor-pointer tracking-wide hover:text-blue-200 transition"
          onClick={() => navigate("/dashboard")}
        >
          H.A.L.O.
        </h1>

        <div className="flex flex-col items-center gap-2 w-full">
          <input
            type="text"
            placeholder="Patient Name"
            className="rounded-full px-3 py-1 text-black w-full text-sm"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
          />

          <input
            type="text"
            placeholder="Room #"
            className="rounded-full px-3 py-1 text-black w-full text-sm"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />

          <button
            onClick={handleAdd}
            className="bg-white text-blue-700 font-bold px-3 py-1 rounded-full w-full text-sm hover:bg-gray-200 transition"
          >
            + Add Patient
          </button>
        </div>

        <div className="w-full mt-4">
          <label className="block text-sm text-white mb-1">Nurse Notes</label>
          <textarea
            value={notes}
            onChange={(e) => handleSaveNotes(e.target.value)}
            disabled={!selectedPatient?.id}
            className={`w-full p-2 rounded text-sm h-28 resize-none ${
              selectedPatient?.id ? "text-black" : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            placeholder={
              selectedPatient?.id ? "Enter patient notes..." : "Select a patient to view notes"
            }
          />
        </div>
      </div>

      <div className="text-xs text-blue-200 text-center opacity-60">
        HALO v2 Beta
      </div>
    </div>
  );
};

export default Sidebar;
