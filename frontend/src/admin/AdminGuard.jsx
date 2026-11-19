import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { ADMIN_ROLE, USERS_COLLECTION } from "./adminUtils";
import "../styles/tokens.css";
import "./Admin.css";

export default function AdminGuard({ onLogout, children }) {
  const [state, setState] = useState("checking"); // checking | allowed | denied | error
  const [signedIn, setSignedIn] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      setSignedIn(Boolean(user));
      if (!user) {
        setState("denied");
        return;
      }
      setState("checking");
      try {
        const snap = await getDoc(doc(db, USERS_COLLECTION, user.uid));
        const isAdmin = snap.exists() && snap.data().role === ADMIN_ROLE;
        if (active) setState(isAdmin ? "allowed" : "denied");
      } catch (e) {
        console.error(e);
        if (active) setState("error");
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt]);

  function retry() {
    setState("checking");
    setAttempt((a) => a + 1);
  }

  async function logout() {
    try {
      if (onLogout) await onLogout();
      else await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }

  if (state === "checking") return <p role="status">Checking access...</p>;

  if (state === "error") {
    return (
      <div role="alert" className="denied">
        <h1>We could not check your access</h1>
        <p>Please check your connection and try again.</p>
        <div className="actions">
          <button className="btn btn-primary" onClick={retry}>Try again</button>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div role="alert" className="denied">
        <h1>Access denied</h1>
        <p>Only the Platform Admin can open this page.</p>
        <div className="actions">
          {signedIn ? (
            <>
              <a className="btn btn-secondary" href="/">Back to home</a>
              <button className="btn btn-primary" onClick={logout}>Log out and switch account</button>
            </>
          ) : (
            <a className="btn btn-primary" href="/login">Go to login</a>
          )}
        </div>
      </div>
    );
  }

  return children;
}