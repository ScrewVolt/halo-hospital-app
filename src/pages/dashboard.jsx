import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
} from "firebase/firestore";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";

const Dashboard = () => {
  const [patients, setPatients] = useState([]);
  const { selectedPatient, setSelectedPatient, searchTerm } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const storedId = sessionStorage.getItem("selectedPatientId");
  
    if (location.pathname === "/dashboard") {
      setSelectedPatient(null);             // ✅ Lock notes
      sessionStorage.removeItem("selectedPatientId"); // ✅ Clear memory
      return;
    }
  
    if (storedId && patients.length > 0) {
      const match = patients.find((p) => p.id === storedId);
      if (match) setSelectedPatient(match);
    }
  }, [location.pathname, patients]);
  

  // ⬇️ Real-time updates from Firestore
  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "users", userId, "patients"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPatients(patientList);
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPatient = async (name, room) => {
    if (!name.trim() || !room.trim()) return;

    const alreadyExists = patients.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (alreadyExists) return;

    await addDoc(collection(db, "users", userId, "patients"), {
      name: name.trim(),
      room: room.trim(),
      createdAt: new Date(),
    });

    // ✅ No need to fetch manually — onSnapshot handles updates
  };

  const handleDeletePatient = async (id) => {
    await deleteDoc(doc(db, "users", userId, "patients", id));
    // ✅ Real-time sync will update patients automatically
  };

  const goToPatient = (id) => {
    sessionStorage.setItem("selectedPatientId", id);
    navigate(`/patient/${id}`);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex-1 p-8">
        <h2 className="text-4xl font-bold mb-8 text-center text-blue-800">
          Patients
        </h2>

        <div className="w-full bg-white rounded-lg shadow-md overflow-hidden border border-gray-300">
          <div className="bg-blue-700 text-white font-semibold flex px-6 py-3 text-sm tracking-wide">
            <div className="flex-1">Patient Name</div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                className="flex px-6 py-4 hover:bg-gray-100 transition cursor-pointer text-lg"
              >
                <div
                  className="flex-1"
                  onClick={() => goToPatient(patient.id)}
                >
                  {patient.name}
                  {patient.room && (
                    <span className="text-sm text-gray-500 ml-2">
                      Room Number #{patient.room}
                    </span>
                  )}
                </div>

                <div
                  className="w-8 text-center text-red-500 font-bold hover:text-red-700"
                  onClick={() => handleDeletePatient(patient.id)}
                >
                  ✕
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
