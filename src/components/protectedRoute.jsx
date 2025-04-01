import { Navigate } from "react-router-dom"
import { useAuth } from "../authContext"

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return null // or add a spinner here later

  return user ? children : <Navigate to="/" />
}
