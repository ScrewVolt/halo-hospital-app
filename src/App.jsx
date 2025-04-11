import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import VisitHistory from "./pages/VisitHistory";
import SessionEntry from "./pages/SessionEntry";
import ProtectedRoute from "./components/protectedRoute";
import Login from "./pages/login";
import MainLayout from "./layout/mainLayout"; // New layout wrapper
import { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, getDocs, query } from "firebase/firestore";

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

  const handleSearch = (value) => setSearchTerm(value);

  const handleAddPatient = () => {}; // Optional stub

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