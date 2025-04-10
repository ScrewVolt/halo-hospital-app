import { useAuthState } from "react-firebase-hooks/auth";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return <p>Loading...</p>;  // Optional spinner/loading state
  if (!user) return <Navigate to="/" />;  // Redirect to login if not signed in

  return children;  // Allow access if user is signed in
};

export default ProtectedRoute;
