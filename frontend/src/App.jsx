import { useEffect } from "react";
import { auth, db } from "./firebase";

function App() {
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

export default App;