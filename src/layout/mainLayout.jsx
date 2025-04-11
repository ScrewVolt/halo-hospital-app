import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = ({ patients, onSearch, onAddPatient, selectedPatient }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        patients={patients}
        onSearch={onSearch}
        onAddPatient={onAddPatient}
        selectedPatient={selectedPatient}
      />
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
