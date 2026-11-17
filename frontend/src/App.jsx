import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import DonorRegistration from "./DonorRegistration";
import DonorHome from "./DonorHome";

function App() {
  // donorName is empty until someone registers. Once it has a value,
  // we show the donor home screen (D01) instead of the form.
  // (A proper router will replace this later when more screens exist.)
  const [donorName, setDonorName] = useState("");

  useEffect(() => {
    // Keeps your Firebase connection check active in the browser console (F12)
    console.log("Firebase Auth:", auth);
    console.log("Firestore:", db);
    console.log("Firebase connection initialized!");
  }, []);

  // Registered? -> show the home screen. Otherwise -> show the form.
  if (donorName) {
    return <DonorHome name={donorName} />;
  }

  return <DonorRegistration onRegistered={setDonorName} />;
}

export default App;
