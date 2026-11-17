// src/features/auth/S05Login.jsx
// Basic login (wireframe S05). Role-based redirects come in a later ticket;
// for now every successful login goes to /status.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

export default function S05Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/status");
    } catch {
      // Generic message on purpose (UI guide S05): never reveal which part was wrong
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-blue-50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: "100%",
          background: "var(--color-white)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          color: "var(--color-ink-900)",
        }}
      >
        <h1 style={{ font: "var(--text-h1)", margin: 0 }}>Blood Bridge</h1>
        <p style={{ margin: 0, color: "var(--color-ink-600)" }}>Log in to your account</p>

        <label style={label} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />

        <label style={label} htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          style={input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div
            role="alert"
            style={{
              background: "var(--color-red-100)",
              color: "var(--color-red-700)",
              font: "var(--text-small)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            font: "var(--text-label)",
            height: 48,
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: loading || !email || !password ? "not-allowed" : "pointer",
            background: loading || !email || !password ? "var(--color-ink-100)" : "var(--color-blue-600)",
            color: loading || !email || !password ? "var(--color-ink-300)" : "var(--color-white)",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}

const label = { font: "var(--text-label)" };
const input = {
  font: "var(--text-body)",
  height: 40,
  padding: "0 var(--space-3)",
  border: "1px solid var(--color-ink-300)",
  borderRadius: "var(--radius-md)",
};
