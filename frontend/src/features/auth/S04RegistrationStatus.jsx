// src/features/auth/S04RegistrationStatus.jsx
// FR2.1 - Registration status page (wireframe S04)
//
// What this file does:
//  1. Finds out who is logged in (Firebase Authentication).
//  2. If nobody is logged in -> sends them to /login.
//  3. Listens LIVE to their organization document in Firestore.
//     Whenever the admin changes `status`, this page updates by itself.
//  4. Shows Pending / Approved / Rejected.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase";

// TODO: change these to the real routes your team picks
const DASHBOARD_ROUTE = {
  hospital: "/hospital-admin", // HA01
  bloodbank: "/bloodbank", // B01
};

export default function S04RegistrationStatus() {
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [org, setOrg] = useState(undefined); // undefined = loading, null = no document
  const [error, setError] = useState(false);

  // --- 1 & 2. Who is logged in? Kick out if nobody. ---
  useEffect(() => {
    const stopListening = onAuthStateChanged(auth, (u) => {
      if (!u) navigate("/login", { replace: true });
      else setUser(u);
    });
    return stopListening; // cleanup when leaving the page
  }, [navigate]);

  // --- 3. Live listener on organizations/{uid} ---
  useEffect(() => {
    if (!user) return;
    const stopListening = onSnapshot(
      doc(db, "organisations", user.uid),
      (snap) => {
        setError(false);
        setOrg(snap.exists() ? snap.data() : null);
      },
      () => setError(true) // e.g. network problem or rules blocked it
    );
    return stopListening;
  }, [user]);

  // --- Loading / error / empty states (UI guide section 10) ---
  if (user === undefined || (org === undefined && !error)) {
    return (
      <Shell>
        <p style={{ color: "var(--color-ink-600)" }}>Loading your registration...</p>
      </Shell>
    );
  }
  if (error) {
    return (
      <Shell>
        <Banner tone="error">
          We could not load your registration status. Check your connection and try again.
        </Banner>
        <button style={btn("secondary")} onClick={() => window.location.reload()}>
          Try again
        </button>
      </Shell>
    );
  }
  if (org === null) {
    return (
      <Shell>
        <h1 style={h1}>No registration found</h1>
        <p style={{ color: "var(--color-ink-600)" }}>
          We could not find an organization registration for this account.
        </p>
      </Shell>
    );
  }

  // --- 4. The three views ---
  const status = org.status; // "pending" | "approved" | "rejected"

  return (
    <Shell>
      {status === "pending" && (
        <>
          <h1 style={h1}>Registration submitted</h1>
          <StatusPill status="pending" />
          <p style={{ color: "var(--color-ink-600)" }}>
            The Platform Admin is reviewing your registration. This page updates
            automatically when a decision is made.
          </p>
          <Stepper current={1} />
        </>
      )}

      {status === "approved" && (
        <>
          <h1 style={h1}>Registration approved</h1>
          <StatusPill status="approved" />
          <p style={{ color: "var(--color-ink-600)" }}>
            Your organization is approved. You now have access to your dashboard.
          </p>
          <Stepper current={2} done />
          <button
            style={btn("primary")}
            onClick={() => navigate(DASHBOARD_ROUTE[org.type] ?? "/")}
          >
            Go to dashboard
          </button>
        </>
      )}

      {status === "rejected" && (
        <>
          <h1 style={h1}>Registration rejected</h1>
          <StatusPill status="rejected" />
          <Banner tone="error">
            <strong>Reason: </strong>
            {org.rejectionReason || "No reason was given."}
          </Banner>
          {/* TODO: link to S03 prefilled once the resubmit ticket exists */}
          <button style={btn("primary")} onClick={() => navigate("/signup/organization")}>
            Edit and resubmit
          </button>
        </>
      )}

      {!["pending", "approved", "rejected"].includes(status) && (
        <Banner tone="error">Unknown status. Please contact support.</Banner>
      )}

      {status !== "approved" && (
        <button style={btn("link")} onClick={() => navigate("/")}>
          Back to home
        </button>
      )}
    </Shell>
  );
}

/* ---------- small pieces (later move these to components/ui/ and share them) ---------- */

function Shell({ children }) {
  // AuthShell look: centered 480px card on a blue-50 background
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
          alignItems: "center",
          gap: "var(--space-4)",
          textAlign: "center",
          color: "var(--color-ink-900)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const STATUS_STYLE = {
  pending: { label: "Pending approval", icon: "🕒", bg: "var(--color-blue-100)", color: "var(--color-blue-700)" },
  approved: { label: "Approved", icon: "✔", bg: "var(--color-blue-600)", color: "var(--color-white)" },
  rejected: { label: "Rejected", icon: "✖", bg: "var(--color-red-100)", color: "var(--color-red-700)" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      role="status"
      style={{
        background: s.bg,
        color: s.color,
        font: "var(--text-caption)",
        padding: "var(--space-1) var(--space-3)",
        borderRadius: "var(--radius-pill)",
      }}
    >
      {s.icon} Status: {s.label}
    </span>
  );
}

function Stepper({ current, done = false }) {
  const steps = ["Submitted", "Under review", "Approved"];
  return (
    <ol style={{ display: "flex", gap: "var(--space-6)", listStyle: "none", padding: 0, margin: 0 }}>
      {steps.map((label, i) => {
        const filled = i < current || (done && i === current);
        const isCurrent = i === current && !done;
        return (
          <li key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "var(--radius-pill)",
                background: filled ? "var(--color-blue-600)" : "var(--color-white)",
                border: `2px solid ${filled || isCurrent ? "var(--color-blue-600)" : "var(--color-ink-300)"}`,
                boxShadow: isCurrent ? "var(--focus-ring)" : "none",
              }}
            />
            <span style={{ font: "var(--text-small)", color: "var(--color-ink-600)" }}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Banner({ tone, children }) {
  const error = tone === "error";
  return (
    <div
      role="alert"
      style={{
        width: "100%",
        textAlign: "left",
        font: "var(--text-small)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-md)",
        background: error ? "var(--color-red-100)" : "var(--color-blue-50)",
        color: error ? "var(--color-red-700)" : "var(--color-ink-900)",
      }}
    >
      {children}
    </div>
  );
}

const h1 = { font: "var(--text-h1)", margin: 0 };

function btn(variant) {
  const base = { font: "var(--text-label)", borderRadius: "var(--radius-md)", height: 48, padding: "0 var(--space-6)", cursor: "pointer" };
  if (variant === "primary") return { ...base, background: "var(--color-blue-600)", color: "var(--color-white)", border: "none" };
  if (variant === "secondary") return { ...base, background: "var(--color-white)", color: "var(--color-blue-600)", border: "1px solid var(--color-blue-600)" };
  return { ...base, background: "none", color: "var(--color-blue-600)", border: "none", height: 40 };
}