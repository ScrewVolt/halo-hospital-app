import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Sidebar = ({ onSearch, onAddPatient }) => {
    const navigate = useNavigate();
  
    const [query, setQuery] = useState("");

    const handleSearch = () => {
    if (onSearch) onSearch(query);
    };

    const [room, setRoom] = useState("");
    
    const handleAdd = () => {
      if (onAddPatient) onAddPatient(query, room);
      setQuery("");
      setRoom("");
    };
    


    return (
      <div className="bg-blue-700 text-white w-80 min-h-screen flex flex-col justify-between py-6 px-4">
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
    
          {/* New Nurse Notes section */}
          <div className="w-full mt-6">
            <h2 className="text-sm font-semibold mb-2">Nurse Notes</h2>
            <textarea
              rows={6}
              placeholder="Patient-specific notes..."
              className="w-full rounded p-2 text-sm text-black"
            ></textarea>
          </div>
        </div>
    
        <div className="text-xs text-blue-200 text-center opacity-60 mt-6">
          HALO v2 Beta
        </div>
      </div>
    );
    
};

export default Sidebar;
