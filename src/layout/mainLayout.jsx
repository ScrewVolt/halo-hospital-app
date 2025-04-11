import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const MainLayout = ({ patients, onSearch, onAddPatient, selectedPatient, setSelectedPatient }) => {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar
          patients={patients}
          selectedPatient={selectedPatient}
          setSelectedPatient={setSelectedPatient}
          onAddPatient={onAddPatient}
          onSearch={onSearch}
        />
        <div className="flex-1 p-8 overflow-y-auto">
          <Outlet context={{ selectedPatient, setSelectedPatient }} />
        </div>
      </div>
    );
  };
  

export default MainLayout;
