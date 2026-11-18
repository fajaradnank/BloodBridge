import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import AdminShell from "./AdminShell";
import AdminReviewOrganization from "./AdminReviewOrganization";
import {
  ORGS_COLLECTION, STATUS, normalizeStatus, typeLabel, formatDate, timeAgo, submittedMillis,
} from "./adminUtils";

const TABS = [
  { key: STATUS.PENDING, label: "Pending" },
  { key: STATUS.APPROVED, label: "Approved" },
  { key: STATUS.REJECTED, label: "Rejected" },
];

export default function AdminApprovals({ onLogout }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState(STATUS.PENDING);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState("");

  // Live listener: the queue updates by itself when an org is approved/rejected (AC7)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, ORGS_COLLECTION),
      (snap) => {
        setOrgs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error loading organizations:", err);
        setError("We could not load organizations.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [attempt]);

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((a) => a + 1);
  }

  const pendingCount = orgs.filter((o) => normalizeStatus(o.status) === STATUS.PENDING).length;
  const selectedOrg = orgs.find((o) => o.id === selectedId);

  const visible = orgs
    .filter((o) => normalizeStatus(o.status) === tab)
    .filter((o) => (o.name ?? "").toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => submittedMillis(a) - submittedMillis(b)); // oldest first (A01)

  let emptyText = `No ${tab} organizations found.`;
  if (search.trim()) emptyText = "No organizations match your search.";
  else if (tab === STATUS.PENDING) emptyText = "No organization waiting for approval";

  let content;
  if (selectedOrg) {
    content = (
      <AdminReviewOrganization
        org={selectedOrg}
        onBack={() => setSelectedId(null)}
        onDecided={(message) => {
          setNotice(message);
          setSelectedId(null);
        }}
      />
    );
  } else {
    content = (
      <div className="admin-page">
        <h1>Approvals</h1>

        {notice && (
          <div role="status" className="banner banner-success">
            {notice}{" "}
            <button className="btn btn-link" onClick={() => setNotice("")}>Dismiss</button>
          </div>
        )}

        <div className="queue-controls">
          <div className="admin-tabs" role="tablist">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={`admin-tab ${tab === key ? "active" : ""}`}
                onClick={() => {
                  setTab(key);
                  setNotice("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="search-box">
            <label className="sr-only" htmlFor="org-search">Search by name</label>
            <input
              id="org-search"
              className="admin-input"
              type="text"
              placeholder="Search by name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="banner banner-error">
            {error} <button onClick={retry}>Try again</button>
          </div>
        )}

        {loading && <p role="status">Loading organizations...</p>}

        {!loading && !error && visible.length === 0 && <p className="empty">{emptyText}</p>}

        {!loading && !error && visible.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((org) => (
                  <tr key={org.id}>
                    <td data-label="Organization">{org.name}</td>
                    <td data-label="Type">{typeLabel(org.type)}</td>
                    <td data-label="Submitted">
                      <span>{formatDate(org.createdAt)}</span>{" "}
                      <span className="muted">{timeAgo(org.createdAt)}</span>
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn btn-secondary"
                        aria-label={`Review ${org.name}`}
                        onClick={() => setSelectedId(org.id)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return <AdminShell pendingCount={pendingCount} onLogout={onLogout}>{content}</AdminShell>;}