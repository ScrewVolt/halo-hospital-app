import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, getDocs, query, addDoc } from "firebase/firestore";

import Dashboard from "./pages/dashboard";
import VisitHistory from "./pages/VisitHistory";
import SessionEntry from "./pages/SessionEntry";
import ProtectedRoute from "./components/protectedRoute";
import Login from "./pages/login";
import MainLayout from "./layout/mainLayout";

function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      fetchPatients();
    }
  }, [userId]);

  const fetchPatients = async () => {
    if (!userId) return;
    const q = query(collection(db, "users", userId, "patients"));
    const snapshot = await getDocs(q);
    const patientList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setPatients(patientList);

    const storedId = sessionStorage.getItem("selectedPatientId");
    if (storedId) {
      const match = patientList.find(p => p.id === storedId);
      if (match) setSelectedPatient(match);
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleAddPatient = async (name, room) => {
    if (!userId || !name || !room) return;
    const newPatient = {
      name: name.trim(),
      room: room.trim(),
      createdAt: new Date(),
    };
    await addDoc(collection(db, "users", userId, "patients"), newPatient);
    fetchPatients(); // Refresh after add
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route
          element={
            <ProtectedRoute>
            <MainLayout
              patients={patients}
              onSearch={handleSearch}
              onAddPatient={handleAddPatient}
              selectedPatient={selectedPatient}
              setSelectedPatient={setSelectedPatient}
            />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patient/:patientId" element={<VisitHistory />} />
          <Route path="/session/:patientId/:sessionId" element={<SessionEntry />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
