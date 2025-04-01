// ✅ App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Login from "./pages/login"
import Layout from "./components/Layout"
import Patients from "./pages/patients"
import ProtectedRoute from "./components/protectedRoute"
import { AuthProvider } from "./authContext"

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<Login />} />

          {/* Protected Layout with Nested Outlet */}
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Patients />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App