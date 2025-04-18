import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const Sidebar = ({ patients = [], onSearch, onAddPatient, selectedPatient }) => {
  const navigate = useNavigate();

  const [query, setQuery] = useState(""); // for adding
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [searchInput, setSearchInput] = useState(""); // NEW: separate from query

  const handleAdd = () => {
    const trimmedName = query.trim();
    const trimmedRoom = room.trim();

    if (!trimmedName || !trimmedRoom) return;

    onAddPatient?.(trimmedName, trimmedRoom);
    setQuery(""); // clear add input
    setRoom("");
    setSearchInput("");       // ✅ Clear search bar
    onSearch?.("");           // ✅ Clear filter in dashboard
  };

  useEffect(() => {
    onSearch?.(searchInput); // 🔁 Keep dashboard in sync with search input
  }, [searchInput]);

  useEffect(() => {
    if (!selectedPatient) {
      setNotes(""); // Clear notes
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
        <img
          src="/logo.png"
          alt="HALO Logo"
          onClick={() => navigate("/dashboard")}
          className="w-20 h-20 cursor-pointer hover:scale-105 transition-transform"
        />

        <h1
          className="text-3xl font-bold cursor-pointer tracking-wide hover:text-blue-200 transition"
          onClick={() => navigate("/dashboard")}
        >
          H.A.L.O.
        </h1>

        <div className="flex flex-col items-center gap-2 w-full">
          <input
            type="text"
            placeholder="Search Patients"
            className="rounded-full px-3 py-1 text-black w-full text-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)} // 🔁 real-time search
          />

          <input
            type="text"
            placeholder="Patient Name"
            className="rounded-full px-3 py-1 text-black w-full text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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

        {selectedPatient?.id && (
          <div className="w-full mt-4">
            <label className="block text-sm text-white mb-1">Nurse Notes</label>
            <textarea
              value={notes}
              onChange={(e) => handleSaveNotes(e.target.value)}
              className="w-full p-2 rounded text-sm h-28 resize-none text-black"
              placeholder="Enter patient notes..."
            />
          </div>
        )}
      </div>

      <div className="text-xs text-blue-200 text-center opacity-60">
        HALO v2 Beta
      </div>
    </div>
  );
};

export default Sidebar;