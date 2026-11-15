import { useEffect } from "react";
import { auth, db } from "./firebase";
import DonorRegistration from "./DonorRegistration";

function App() {
  useEffect(() => {
    // Keeps your Firebase connection check active in the browser console (F12)
    console.log("Firebase Auth:", auth);
    console.log("Firestore:", db);
    console.log("Firebase connection initialized!");
  }, []);

  // Renders the donor registration form
  return <DonorRegistration />;
}

export default App;