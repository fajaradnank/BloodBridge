export const ORGS_COLLECTION = "organisations"; 
export const USERS_COLLECTION = "users";
export const ADMIN_ROLE = "platformAdmin";

export const STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" };

// Accepts "Pending Approval", "pending", "Approved", "rejected", etc.
export function normalizeStatus(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("pending")) return STATUS.PENDING;
  if (s.includes("approv")) return STATUS.APPROVED;
  if (s.includes("reject")) return STATUS.REJECTED;
  return STATUS.PENDING; // FR2.1: new registrations start as Pending Approval
}

export function typeLabel(raw) {
  return String(raw ?? "").toLowerCase().includes("blood") ? "Blood bank" : "Hospital";
}

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds != null) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(ts) {
  const d = toDate(ts);
  if (!d) return "N/A";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function submittedMillis(org) {
  const d = toDate(org.createdAt);
  return d ? d.getTime() : Number.MAX_SAFE_INTEGER;
}

export function getDocuments(org) {
  const raw = org.documents ?? org.documentUrls ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter(Boolean).map((d, i) =>
    typeof d === "string"
      ? { name: `Document ${i + 1}`, url: d }
      : { name: d.name || `Document ${i + 1}`, url: d.url }
  );
}

export function timeAgo(ts, now = Date.now()) {
  const d = toDate(ts);
  if (!d) return "";
  const mins = Math.floor((now - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}