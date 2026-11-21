// src/features/auth/S04RegistrationStatus.jsx
// FR2.1 - Registration status page (wireframe S04)
// Updated to work with state-based routing in App.jsx (No react-router-dom needed)

export default function S04RegistrationStatus({ org, onBack, onResubmit }) {
  // If no org data was found from App.jsx, show a fallback
  if (!org) {
    return (
      <Shell>
        <h1 style={h1}>No registration found</h1>
        <p style={{ color: "var(--color-ink-600)" }}>
          We could not find an organization registration for this account.
        </p>
        <button style={btn("link")} onClick={onBack}>
          Back to home
        </button>
      </Shell>
    );
  }

  // Normalize the status to handle "Pending Approval", "pending", "Approved", "Rejected", etc.
  const status = String(org.status || "").toLowerCase();
  const isPending = status.includes("pending");
  const isApproved = status.includes("approv");
  const isRejected = status.includes("reject");

  return (
    <Shell>
      {isPending && (
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

      {isApproved && (
        <>
          <h1 style={h1}>Registration approved</h1>
          <StatusPill status="approved" />
          <p style={{ color: "var(--color-ink-600)" }}>
            Your organization is approved. You now have access to your dashboard.
          </p>
          <Stepper current={2} done />
          <button style={btn("primary")} onClick={onBack}>
            Go to dashboard
          </button>
        </>
      )}

      {isRejected && (
        <>
          <h1 style={h1}>Registration rejected</h1>
          <StatusPill status="rejected" />
          <Banner tone="error">
            <strong>Reason: </strong>
            {org.rejectionReason || "No reason was given."}
          </Banner>
          <button 
            style={btn("primary")} 
            onClick={() => onResubmit ? onResubmit() : alert("S03 Registration Form will be integrated here.")}
          >
            Edit and resubmit
          </button>
        </>
      )}

      {!isPending && !isApproved && !isRejected && (
        <Banner tone="error">Unknown status. Please contact support.</Banner>
      )}

      {!isApproved && (
        <button style={btn("link")} onClick={onBack}>
          Back to home
        </button>
      )}
    </Shell>
  );
}

/* ---------- UI Components ---------- */

function Shell({ children }) {
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
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
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

const h1 = { font: "var(--text-h1)", margin: 0, color: "var(--color-ink-900)" };

function btn(variant) {
  const base = { font: "var(--text-label)", borderRadius: "var(--radius-md)", height: 48, padding: "0 var(--space-6)", cursor: "pointer" };
  if (variant === "primary") return { ...base, background: "var(--color-blue-600)", color: "var(--color-white)", border: "none" };
  if (variant === "secondary") return { ...base, background: "var(--color-white)", color: "var(--color-blue-600)", border: "1px solid var(--color-blue-600)" };
  return { ...base, background: "none", color: "var(--color-blue-600)", border: "none", height: 40 };
}