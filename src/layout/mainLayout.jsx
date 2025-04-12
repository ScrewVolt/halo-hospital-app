import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = ({
  patients = [],
  onAddPatient,
  selectedPatient,
  setSelectedPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState(""); // ✅ local state

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        patients={patients}
        selectedPatient={selectedPatient}
        setSelectedPatient={setSelectedPatient}
        onAddPatient={onAddPatient}
        onSearch={setSearchTerm} // ✅ pass state updater
      />
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet
          context={{ selectedPatient, setSelectedPatient, searchTerm }} // ✅ fixed
        />
      </div>
    </div>
  );
};

export default MainLayout;
