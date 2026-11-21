import "./LockedDashboard.css";

// Buttons shown (disabled) while the organisation is not approved.
const BLOOD_BANK_ACTIONS = ["Requests", "Stock"];
const HOSPITAL_ACTIONS = ["New request", "Request history"];

function LockIcon() {
  return (
    <svg
      className="locked-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * Locked state shown when a hospital / blood bank LOGS IN
 * while its account is not approved (pending or rejected).
 * Wireframes B01 / H01 - "Not approved" alternate state.
 */
export default function LockedDashboard({ org, isBloodBank, onLogout }) {
  const status = String(org?.status || "").trim().toLowerCase();
  const message =
    status === "rejected"
      ? "Your registration was not approved."
      : "Your account is pending approval.";

  const actions = isBloodBank ? BLOOD_BANK_ACTIONS : HOSPITAL_ACTIONS;

  return (
    <div className="locked-page">
      <header className="locked-header">
        <span className="locked-brand">BloodBridge</span>
        <div className="locked-header-right">
          <span className="locked-org-name">{org?.name || "Your organisation"}</span>
          <button type="button" className="locked-logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="locked-main">
        <div className="locked-banner" role="status">
          <LockIcon />
          <p>{message}</p>
        </div>

        <div className="locked-actions">
          {actions.map((label) => (
            <button
              key={label}
              type="button"
              className="locked-action"
              disabled
              aria-disabled="true"
            >
              {label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
