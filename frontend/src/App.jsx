import { useState, useEffect } from "react";
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";

import S01Landing from "./S01Landing";
import Login from "./Login"; // Fajar's login
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import DonorRegistration from "./DonorRegistration";
import DonorHome from "./DonorHome";
import AdminPage from "./admin/AdminPage";
import OrgApp from "./OrgApp"; // Eesha's S03 flow: form -> OTP -> status
import LockedDashboard from "./features/auth/LockedDashboard";

import OrgRegistrationStatus from "./OrgRegistrationStatus";
import { auth, db } from "./firebase";
import "./styles/tokens.css";
import "./Login.css";

// ---------- ACCESS CONTROL (FR3 / DR3) ----------

const ROLE_DESTINATIONS = {
  donor: "D01",
  hospitalstaff: "H01",
  hospitaladmin: "HA01",
  platformadmin: "A01",
  bloodbankstaff: "B01",
};

// The ONLY screens each role may open. Add new screens here as you build them.
const ALLOWED_SCREENS = {
  donor: ["D01"],
  hospitaladmin: ["HA01", "H01"],
  hospitalstaff: ["H01"],
  bloodbankstaff: ["B01"],
  platformadmin: ["A01"],
};

const ORG_ROLES = ["hospitaladmin", "hospitalstaff", "bloodbankstaff"];

function normalizeRole(role = "") {
  return String(role).toLowerCase().replace(/[\s_-]/g, "");
}

// Accepts "bloodbank", "blood bank", "Blood Bank", "blood_bank"
function isBloodBankType(type = "") {
  return String(type).toLowerCase().replace(/[\s_-]/g, "").includes("bloodbank");
}

function canAccess(role, screen) {
  return !!ALLOWED_SCREENS[role]?.includes(screen);
}

// Only an exact "approved" status unlocks operational features.
function isApproved(org) {
  return String(org?.status || "").trim().toLowerCase() === "approved";
}

async function findOrganisation(user) {
  if (!user) return null;

  // 1) Org docs are saved at organisations/{uid} (see OrgOtpVerify)
  const byId = await getDoc(doc(db, "organisations", user.uid));
  if (byId.exists()) return { id: byId.id, ...byId.data() };

  // 2) Fallback for older records keyed differently
  if (!user.email) return null;
  try {
    const snap = await getDocs(
      query(collection(db, "organisations"), where("email", "==", user.email))
    );
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (err) {
    console.error("Organisation email lookup failed:", err);
    return null;
  }
}

function AccessDenied({ onBack }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-heading">
          <h1>Access denied</h1>
          <p>You do not have permission to open this screen.</p>
        </div>
        <button type="button" className="login-submit" onClick={onBack}>Log out</button>
      </section>
    </main>
  );
}

// ---------- APP ----------

function App() {
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "resetPassword" && params.get("oobCode")) return "reset";
    return "landing";
  });

  const [destination, setDestination] = useState(null);
  const [role, setRole] = useState("");
  const [profile, setProfile] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null); // needed for S04
  const [registeredDonorName, setRegisteredDonorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Guarded navigation: use this for EVERY in-app screen change after login.
  // eslint-disable-next-line no-unused-vars
  function navigate(target) {
    if (!canAccess(role, target)) {
      console.warn(`Blocked: role "${role}" cannot open ${target}`);
      return false;
    }
    setDestination(target);
    return true;
  }

  // Live org status: when an admin approves the org, access unlocks automatically.
  useEffect(() => {
    if (!orgProfile?.id) return;
    const unsub = onSnapshot(
      doc(db, "organisations", orgProfile.id),
      (snap) => {
        if (snap.exists()) setOrgProfile({ id: snap.id, ...snap.data() });
      },
      (err) => console.error("Org status listener failed:", err)
    );
    return unsub;
  }, [orgProfile?.id]);

  async function handleLogin(user) {
    setLoading(true);
    setLoginError("");

    try {
      const userSnapshot = await getDoc(doc(db, "users", user.uid));
      let userRole = "";
      let userProfileData = {};
      let org = null;

      if (userSnapshot.exists()) {
        userProfileData = userSnapshot.data();
        userRole = normalizeRole(userProfileData.role);
      } else {
        // Organisation accounts may have no users/{uid} document: fall back to organisations
        org = await findOrganisation(user);
        if (!org) {
          throw new Error("Your account profile was not found. Please contact the administrator.");
        }
        userProfileData = org;
        userRole = isBloodBankType(org.type) ? "bloodbankstaff" : "hospitaladmin";
      }

      const target = ROLE_DESTINATIONS[userRole];
      if (!target) {
        throw new Error("Your account has an unrecognized role. Please contact the administrator.");
      }

      if (ORG_ROLES.includes(userRole)) {
        // TODO (HA02): staff accounts will need an orgId on their users doc
        if (!org) org = await findOrganisation(user);
        setOrgProfile(org);
      } else {
        setOrgProfile(null);
      }

      setRole(userRole);
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
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setDestination(null);
    setRole("");
    setProfile(null);
    setOrgProfile(null);
    setRegisteredDonorName("");
    setLoginError("");
    setScreen("landing");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // --- RENDER LOGIC ---

  if (registeredDonorName) {
    return (
      <>
        <DonorHome name={registeredDonorName} />
        <div className="login-page">
          <button type="button" className="login-submit" onClick={handleLogout}>Log out</button>
        </div>
      </>
    );
  }

  if (destination) {
    // GUARD 1: the user's role must be allowed to open this screen
    if (!canAccess(role, destination)) {
      return <AccessDenied onBack={handleLogout} />;
    }

    // 1. DONOR
    if (destination === "D01") {
      return (
        <>
          <DonorHome name={profile?.name || "Donor"} />
          <div className="login-page">
            <button type="button" className="login-submit" onClick={handleLogout}>Log out</button>
          </div>
        </>
      );
    }

    // 2. PLATFORM ADMIN -> A01
    if (destination === "A01") {
      return <AdminPage onLogout={handleLogout} />;
    }

    // 3. HOSPITAL / BLOOD BANK
    if (["HA01", "H01", "B01"].includes(destination)) {
      if (!orgProfile) {
        return (
          <main className="login-page">
            <section className="login-card">
              <div className="login-heading">
                <h1>Organization not found</h1>
                <p>We could not find your organization record. Please contact the administrator.</p>
              </div>
              <button type="button" className="login-submit" onClick={handleLogout}>Log out</button>
            </section>
          </main>
        );
      }

            // GUARD 2: only an exact "approved" status gets in.
      if (!isApproved(orgProfile)) {
        const statusString = String(orgProfile.status || "").toLowerCase();

        // If they are REJECTED, show the Status Page so they see the reason!
        if (statusString.includes("reject")) {
          return (
            <OrgRegistrationStatus 
              org={orgProfile} 
              onBack={handleLogout} 
              onResubmit={() => setScreen("orgRegister")} 
            />
          );
        }

        // If they are PENDING, show the Locked Dashboard
        return (
          <LockedDashboard
            org={orgProfile}
            isBloodBank={destination === "B01"}
            onLogout={handleLogout}
          />
        );
      }

      // Approved dashboard placeholder (H01 / HA01 / B01 come from later cards)
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

  // --- SCREEN ROUTING (public screens) ---

  if (screen === "landing") {
    return (
      <S01Landing
        onDonate={() => setScreen("register")}
        onRegisterOrg={() => setScreen("orgRegister")}
        onLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "orgRegister") {
    return <OrgApp onExit={() => setScreen("landing")} />;
  }

  if (screen === "register") {
    return (
      <div>
        <DonorRegistration onRegistered={setRegisteredDonorName} />
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => setScreen("landing")}
            style={{ background: "none", border: "none", color: "var(--color-blue-600)", cursor: "pointer" }}
          >
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
        <button
          type="button"
          onClick={() => setScreen("landing")}
          style={{ background: "none", border: "none", color: "var(--color-blue-600)", cursor: "pointer", textDecoration: "underline" }}
        >
          Back to Cover Page
        </button>
      </div>
    </>
  );
}

export default App;
