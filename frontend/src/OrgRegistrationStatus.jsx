import "./OrgRegistration.css";

export default function OrgRegistrationStatus({ org, onBack, onResubmit }) {
  if (!org) return null;

  const status = String(org.status || "").toLowerCase();
  const isRejected = status.includes("reject");

  return (
    <main className="org-page">
      <section className="org-card org-center">
        
        {/* Icon (Checkmark for pending, X for rejected) */}
        <div style={{ fontSize: "48px", marginBottom: "16px", color: isRejected ? "var(--color-red-600)" : "var(--color-blue-600)" }}>
          {isRejected ? "✕" : "✓"}
        </div>

        <h1>{isRejected ? "Registration rejected" : "Registration submitted"}</h1>
        <p className="org-sub">{org.name}</p>
        
        {/* Status Badge */}
        {isRejected ? (
          <span className="org-badge" style={{ background: "var(--color-red-100)", color: "var(--color-red-700)" }}>
            Status: Rejected
          </span>
        ) : (
          <span className="org-badge">Status: Pending approval</span>
        )}

        {/* Rejection Reason Box (Only shows if rejected) */}
        {isRejected && (
          <div style={{
            background: "var(--color-red-100)",
            color: "var(--color-red-700)",
            padding: "16px",
            borderRadius: "8px",
            marginTop: "24px",
            textAlign: "left",
            fontSize: "14px",
            width: "100%",
            boxSizing: "border-box"
          }}>
            <strong>Reason: </strong><br/>
            {org.rejectionReason || "No reason was given."}
          </div>
        )}

        {/* The Stepper (Faded out if rejected) */}
        <div className="org-stepper" aria-label="Registration progress" style={{ opacity: isRejected ? 0.4 : 1 }}>
          <div className="org-step org-done"><i />Submitted</div>
          <div className="org-step org-current"><i />Under review</div>
          <div className="org-step"><i />Approved</div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
          {isRejected && (
            <button className="org-btn" onClick={onResubmit}>
              Edit and resubmit
            </button>
          )}
          
          <button className="org-btn org-btn-secondary" onClick={onBack}>
            Back to home
          </button>
        </div>

      </section>
    </main>
  );
}