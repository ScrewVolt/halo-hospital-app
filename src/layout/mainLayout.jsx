import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = ({
  patients = [],
  onAddPatient,
  selectedPatient,
  setSelectedPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        patients={patients}
        selectedPatient={selectedPatient}
        setSelectedPatient={setSelectedPatient}
        onAddPatient={onAddPatient} // ✅ fixed
        onSearch={setSearchTerm}
      />
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet
          context={{ selectedPatient, setSelectedPatient, searchTerm }}
        />
      </div>
    </div>
  );
};

export default MainLayout;
