// ✅ Layout.jsx with polished sidebar (navy theme + better spacing)
import { useEffect, useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { auth, db } from "../firebase"
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore"
import { signOut } from "firebase/auth"

export default function Layout() {
  const [patients, setPatients] = useState([])
  const [newPatient, setNewPatient] = useState("")
  const [selectedPatient, setSelectedPatient] = useState(null)

  const navigate = useNavigate()
  const user = auth.currentUser

  useEffect(() => {
    if (!user) return

    const patientsRef = collection(db, "users", user.uid, "patients")
    const q = query(patientsRef, orderBy("createdAt", "asc"))

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setPatients(data)
      if (!selectedPatient && data.length > 0) {
        setSelectedPatient(data[0])
      }
    })

    return () => unsub()
  }, [user])

  const handleAddPatient = async () => {
    const name = newPatient.trim()
    if (!name || patients.find(p => p.name === name)) return

    const patientRef = collection(db, "users", user.uid, "patients")
    await addDoc(patientRef, {
      name,
      createdAt: new Date()
    })

    setNewPatient("")
  }

  const handleDeletePatient = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "patients", id))
    if (selectedPatient?.id === id) {
      setSelectedPatient(patients[0] || null)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    navigate("/")
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-blue-900 text-white p-6 flex flex-col justify-between shadow-lg">
        <div>
          <h1 className="text-3xl font-bold mb-6 text-center tracking-wide">HALO</h1>

          <div className="mb-6">
            <input
              value={newPatient}
              onChange={(e) => setNewPatient(e.target.value)}
              placeholder="Add Patient"
              className="w-full p-2 rounded text-black border border-gray-300 focus:outline-none"
            />
            <button
              onClick={handleAddPatient}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded shadow"
            >
              + Add Patient
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
            {patients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition-all duration-200 ${
                  selectedPatient?.id === patient.id
                    ? "bg-blue-700"
                    : "hover:bg-blue-800"
                }`}
              >
                <span className="truncate text-sm font-medium">{patient.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePatient(patient.id)
                  }}
                  className="bg-red-500 hover:bg-red-600 px-2 py-1 text-xs rounded"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-center shadow"
        >
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet context={{ selectedPatient }} />
      </main>
    </div>
  )
}