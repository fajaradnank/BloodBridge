import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { auth, db } from "./firebase";
import S04RegistrationStatus from "./features/auth/S04RegistrationStatus";
import S05Login from "./features/auth/S05Login";

// Your teammate's connection test, kept as the home page for now
function Home() {
  useEffect(() => {
    console.log("Firebase Auth:", auth);
    console.log("Firestore:", db);
    console.log("Firebase connection initialized!");
  }, []);

  return (
    <div>
      <h1>BloodBridge</h1>
      <p>Firebase connection test</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<S04RegistrationStatus />} />
        <Route path="/login" element={<S05Login />} />
      </Routes>
    </BrowserRouter>
  );
}