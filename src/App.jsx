import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import VisitHistory from "./pages/VisitHistory";
import SessionEntry from "./pages/SessionEntry";
import ProtectedRoute from "./components/protectedRoute";
import Login from "./pages/login"; // Your existing login page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/patient/:patientId"
  element={
    <ProtectedRoute>
      <VisitHistory />
    </ProtectedRoute>
  }
/>
<Route
  path="/session/:patientId/:sessionId"
  element={
    <ProtectedRoute>
      <SessionEntry />
    </ProtectedRoute>
  }
/>
      </Routes>
    </Router>
  );
}

export default App;
