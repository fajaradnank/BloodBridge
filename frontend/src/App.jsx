
import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import DonorRegistration from "./DonorRegistration";
import DonorHome from "./DonorHome";

import { auth, db } from "./firebase";
import "./Login.css";

const ROLE_DESTINATIONS = {
  donor: "D01",
  hospitalstaff: "H01",
  hospitaladmin: "HA01",
  platformadmin: "A01",
  bloodbankstaff: "B01",
};

const DASHBOARD_NAMES = {
  H01: "Hospital Staff Dashboard",
  HA01: "Hospital Admin Dashboard",
  A01: "Platform Admin Dashboard",
  B01: "Blood Bank Staff Dashboard",
};

function normalizeRole(role = "") {
  return String(role).toLowerCase().replace(/[\s_-]/g, "");
}

function App() {
  const [screen, setScreen] = useState(() => {
    const params = new URLSearchParams(window.location.search);

    return params.get("mode") === "resetPassword" &&
      params.get("oobCode")
      ? "reset"
      : "login";
  });

  const [destination, setDestination] = useState(null);
  const [profile, setProfile] = useState(null);
  const [registeredDonorName, setRegisteredDonorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Authenticate the user and redirect according to their Firestore role.
  async function handleLogin(user) {
    setLoading(true);
    setLoginError("");

    try {
      const userSnapshot = await getDoc(
        doc(db, "users", user.uid)
      );

      if (!userSnapshot.exists()) {
        throw new Error(
          "Your account profile was not found. Please contact the administrator."
        );
      }

      const userProfile = userSnapshot.data();
      const role = normalizeRole(userProfile.role);
      const target = ROLE_DESTINATIONS[role];

      if (!target) {
        throw new Error(
          "Your account has an unrecognized role. Please contact the administrator."
        );
      }

      setProfile(userProfile);
      setDestination(target);
    } catch (error) {
      console.error("Login redirect failed:", error);

      setLoginError(
        error.message || "Unable to load your account. Please try again."
      );

      await signOut(auth);
    } finally {
      setLoading(false);
    }
  }

  // Sign out and return to the login screen.
  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }

    setDestination(null);
    setProfile(null);
    setRegisteredDonorName("");
    setLoginError("");
    setScreen("login");

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }

  // Registration success integration. FR1 implementation remains unchanged.
  if (registeredDonorName) {
    return (
      <>
        <DonorHome name={registeredDonorName} />

        <div className="login-page">
          <button
            type="button"
            className="login-submit"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </>
    );
  }

  // Display the appropriate destination after successful login.
  if (destination) {
    if (destination === "D01") {
      return (
        <>
          <DonorHome name={profile?.name || "Donor"} />

          <div className="login-page">
            <button
              type="button"
              className="login-submit"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </>
      );
    }

    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-heading">
            <h1>{DASHBOARD_NAMES[destination]}</h1>

            <p>
              Welcome
              {profile?.name ? `, ${profile.name}` : ""}.
              You are signed in.
            </p>

            <p>Screen: {destination}</p>
          </div>

          <button
            type="button"
            className="login-submit"
            onClick={handleLogout}
          >
            Log out
          </button>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="login-page">
        <section className="login-card">
          <h1>Loading your account...</h1>
        </section>
      </main>
    );
  }

  if (screen === "register") {
    return (
      <div>
        <DonorRegistration
          onRegistered={setRegisteredDonorName}
        />

        <button
          type="button"
          onClick={() => setScreen("login")}
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (screen === "forgot") {
    return (
      <ForgotPassword
        onBack={() => setScreen("login")}
      />
    );
  }

  if (screen === "reset") {
    return (
      <ResetPassword
        onBack={() => setScreen("login")}
      />
    );
  }

  return (
    <>
      {loginError && (
        <p className="login-error" role="alert">
          {loginError}
        </p>
      )}

      <Login
        onLogin={handleLogin}
        onShowRegister={() => setScreen("register")}
        onForgotPassword={() => setScreen("forgot")}
      />
    </>
  );
}

export default App;
