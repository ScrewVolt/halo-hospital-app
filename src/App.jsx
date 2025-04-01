import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/login"
import Patients from "./pages/patients"
import ProtectedRoute from "./components/protectedRoute"
import Layout from "./components/Layout"
import { AuthProvider } from "./authContext"

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 🔐 Public Route */}
          <Route path="/" element={<Login />} />

          {/* 🔒 Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* ✅ Default route inside Layout is /patients */}
            <Route index element={<Navigate to="/patients" />} />
            <Route path="patients" element={<Patients />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
