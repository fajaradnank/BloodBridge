import { useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";

import S01Landing from "./S01Landing"; // NEW IMPORT
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import DonorRegistration from "./DonorRegistration";
import DonorHome from "./DonorHome";
import AdminPage from "./admin/AdminPage"; 

import { auth, db } from "./firebase";
import "./Login.css";

// --- TEMPORARY S04 PLACEHOLDER (Until Aleena's code is merged) ---
function S04Placeholder({ org, onLogout }) {
  const isRejected = org?.status?.toLowerCase().includes("reject");
  return (
    <main className="login-page" style={{ background: "var(--color-blue-50)" }}>
      <section className="login-card" style={{ textAlign: "center", borderRadius: "var(--radius-lg)", padding: "var(--space-8)" }}>
        <h1>{isRejected ? "Registration Rejected" : "Registration Submitted"}</h1>
        <p>{org?.name}</p>
        <div style={{ padding: "12px", background: isRejected ? "var(--color-red-100)" : "var(--color-blue-100)", color: isRejected ? "var(--color-red-700)" : "var(--color-blue-700)", borderRadius: "8px", margin: "16px 0" }}>
          <strong>Status: </strong> {org?.status || "Pending Approval"}
        </div>
        {isRejected && org?.rejectionReason && (
          <p style={{ color: "var(--color-red-600)" }}><strong>Reason: </strong> {org.rejectionReason}</p>
        )}
        <button type="button" className="login-submit" onClick={onLogout} style={{ marginTop: "24px" }}>
          Log out
        </button>
      </section>
    </main>
  );
}

const ROLE_DESTINATIONS = {
  donor: "D01",
  hospitalstaff: "H01",
  hospitaladmin: "HA01",
  platformadmin: "A01",
  bloodbankstaff: "B01",
};

function normalizeRole(role = "") {
  return String(role).toLowerCase().replace(/[\s_-]/g, "");
}

function App() {
  // Default to "landing" so the cover page shows first!
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "resetPassword" && params.get("oobCode")) return "reset";
    return "landing"; 
  });

  const [destination, setDestination] = useState(null);
  const [profile, setProfile] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null);
  const [registeredDonorName, setRegisteredDonorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function handleLogin(user) {
    setLoading(true);
    setLoginError("");

    try {
      const userSnapshot = await getDoc(doc(db, "users", user.uid));
      let role = "";
      let userProfileData = {};

      if (userSnapshot.exists()) {
        userProfileData = userSnapshot.data();
        role = normalizeRole(userProfileData.role);
      } else {
        const orgQuery = query(collection(db, "organisations"), where("email", "==", user.email));
        const orgSnapshot = await getDocs(orgQuery);

        if (!orgSnapshot.empty) {
          const orgData = orgSnapshot.docs[0].data();
          userProfileData = orgData;
          role = orgData.type === "bloodbank" ? "bloodbankstaff" : "hospitaladmin";
        } else {
          throw new Error("Your account profile was not found. Please contact the administrator.");
        }
      }

      const target = ROLE_DESTINATIONS[role];

      if (!target) {
        throw new Error("Your account has an unrecognized role. Please contact the administrator.");
      }

      if (["hospitaladmin", "hospitalstaff", "bloodbankstaff"].includes(role)) {
        const orgQuery = query(collection(db, "organisations"), where("email", "==", user.email));
        const orgSnapshot = await getDocs(orgQuery);
        
        if (!orgSnapshot.empty) {
          setOrgProfile({ id: orgSnapshot.docs[0].id, ...orgSnapshot.docs[0].data() });
        } else {
          setOrgProfile(null);
        }
      }

      setProfile(userProfileData);
      setDestination(target);
    } catch (error) {
      console.error("Login redirect failed:", error);
      setLoginError(error.message || "Unable to load your account. Please try again.");
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try { await signOut(auth); } catch (error) { console.error(error); }
    setDestination(null);
    setProfile(null);
    setOrgProfile(null);
    setRegisteredDonorName("");
    setLoginError("");
    setScreen("landing"); // Go back to cover page
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // --- RENDER LOGIC ---

  if (registeredDonorName) {
    return (
      <>
        <DonorHome name={registeredDonorName} />
        <div className="login-page">
          <button className="login-submit" onClick={handleLogout}>Log out</button>
        </div>
      </>
    );
  }

  if (destination) {
    // 1. DONOR
    if (destination === "D01") {
      return (
        <>
          <DonorHome name={profile?.name || "Donor"} />
          <div className="login-page"><button className="login-submit" onClick={handleLogout}>Log out</button></div>
        </>
      );
    }

    // 2. ADMIN
    if (destination === "A01") {
      return <AdminPage onLogout={handleLogout} />; 
    }

    // 3. HOSPITAL / BLOOD BANK
    if (["HA01", "H01", "B01"].includes(destination)) {
      if (orgProfile) {
        const status = String(orgProfile.status || "").toLowerCase();
        if (status.includes("pending") || status.includes("reject")) {
           return <S04Placeholder org={orgProfile} onLogout={handleLogout} />;
        }
      }

      return (
        <main className="login-page" style={{ background: "var(--color-blue-50)" }}>
          <section className="login-card" style={{ borderRadius: "var(--radius-lg)", padding: "var(--space-8)" }}>
            <div className="login-heading" style={{ textAlign: "center" }}>
              <h1>{destination === "B01" ? "Blood Bank Dashboard" : "Hospital Dashboard"}</h1>
              <p>Welcome{profile?.name ? `, ${profile.name}` : ""}. You are signed in.</p>
              <p>Screen: {destination}</p>
              <p style={{ color: "var(--color-blue-600)" }}>Status: Approved</p>
            </div>
            <button type="button" className="login-submit" onClick={handleLogout}>Log out</button>
          </section>
        </main>
      );
    }
  }

  if (loading) {
    return (
      <main className="login-page">
        <section className="login-card"><h1>Loading your account...</h1></section>
      </main>
    );
  }

  // --- SCREEN ROUTING ---

  // 4. S01 LANDING PAGE (Cover Page)
  if (screen === "landing") {
    return (
      <S01Landing 
        onDonate={() => setScreen("register")}
        onRegisterOrg={() => alert("Hospital/Blood Bank Registration (S03) will go here.")}
        onLogin={() => setScreen("login")}
      />
    );
  }

  // 5. DONOR REGISTRATION (FR1)
  if (screen === "register") {
    return (
      <div>
        <DonorRegistration onRegistered={setRegisteredDonorName} />
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button type="button" onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: "var(--color-blue-600)", cursor: "pointer" }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (screen === "forgot") return <ForgotPassword onBack={() => setScreen("login")} />;
  if (screen === "reset") return <ResetPassword onBack={() => setScreen("login")} />;

  return (
    <>
      {loginError && <p className="login-error" role="alert">{loginError}</p>}
      <Login
        onLogin={handleLogin}
        onShowRegister={() => setScreen("register")}
        onForgotPassword={() => setScreen("forgot")}
      />
      <div style={{ textAlign: "center", marginTop: "15px" }}>
        <button type="button" onClick={() => setScreen("landing")} style={{ background: "none", border: "none", color: "var(--color-blue-600)", cursor: "pointer", textDecoration: "underline" }}>
          Back to Cover Page
        </button>
      </div>
    </>
  );
}

export default App;