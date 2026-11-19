import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import StatusBadge from "./StatusBadge";
import {
  ORGS_COLLECTION, STATUS, normalizeStatus, typeLabel, getDocuments,
} from "./adminUtils";

function Field({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </>
  );
}

export default function AdminReviewOrganization({ org, onBack, onDecided }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!org) return <div className="admin-page">No organization selected.</div>;

  const status = normalizeStatus(org.status);
  const isPending = status === STATUS.PENDING;
  const trimmedReason = reason.trim();
  const documents = getDocuments(org);

  async function decide(decision) {
    setBusy(true);
    setError(null);
    try {
      await updateDoc(doc(db, ORGS_COLLECTION, org.id), {
        status: decision === "approve" ? "Approved" : "Rejected",
        rejectionReason: decision === "approve" ? null : trimmedReason,
        reviewedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.uid ?? null,
      });
      if (onDecided) onDecided(`${org.name} was ${decision === "approve" ? "approved" : "rejected"}.`);
    } catch (e) {
      console.error(e);
      setError("We could not save your decision. Please try again.");
      setBusy(false);
    }
  }

  function handleReject() {
    if (!trimmedReason) return;
    const ok = window.confirm(`Reject ${org.name}? The organization will be notified with your reason.`);
    if (ok) decide("reject");
  }

  return (
    <div className="admin-page review">
      <button className="btn btn-link" onClick={onBack}>&larr; Back to queue</button>

      <div className="card">
        <h1>
          {org.name} <StatusBadge status={status} />
        </h1>

        <dl className="details">
          <Field label="Organization type" value={typeLabel(org.type)} />
          <Field label="Address" value={org.address} />
          <Field label="Official email" value={org.email} />
          <Field label="Official phone" value={org.phone} />
          <Field label="Registration no." value={org.registrationNo} />
          <Field label="License no." value={org.licenseNo} />
          <Field label="Contact person" value={org.contactPerson} />
          <Field label="Account holder" value={org.accountHolder} />
          <dt>Status</dt>
          <dd><StatusBadge status={status} /></dd>
        </dl>

        <h2>Documents</h2>
        {documents.length === 0 ? (
          <p className="empty">No documents uploaded.</p>
        ) : (
          <ul>
            {documents.map((d) => (
              <li key={d.url}>
                <a href={d.url} target="_blank" rel="noopener noreferrer">{d.name}</a>
              </li>
            ))}
          </ul>
        )}

        {isPending ? (
          <>
            <label className="admin-label" htmlFor="reason">Reason (required if rejecting)</label>
            <textarea
              id="reason"
              className="admin-input"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && <div role="alert" className="banner banner-error">{error}</div>}
            <div className="actions">
              <button className="btn btn-primary" disabled={busy} onClick={() => decide("approve")}>
                Approve
              </button>
              <button className="btn btn-danger" disabled={!trimmedReason || busy} onClick={handleReject}>
                Reject
              </button>
            </div>
          </>
        ) : (
          <>
            <p>This organization has already been {status}.</p>
            {org.rejectionReason && <p>Reason given: {org.rejectionReason}</p>}
          </>
        )}
      </div>
    </div>
  );
}