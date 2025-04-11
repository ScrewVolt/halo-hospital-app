import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = ({
  patients,
  selectedPatient,
  onAddPatient,
  onSearch
}) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        patients={patients}
        selectedPatient={selectedPatient}
        onAddPatient={onAddPatient}
        onSearch={onSearch}
      />
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
