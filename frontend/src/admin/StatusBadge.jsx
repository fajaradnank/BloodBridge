import { STATUS } from "./adminUtils";

const CONFIG = {
  [STATUS.PENDING]: { label: "Pending approval", icon: "◷", cls: "badge-pending" },
  [STATUS.APPROVED]: { label: "Approved", icon: "✓", cls: "badge-approved" },
  [STATUS.REJECTED]: { label: "Rejected", icon: "✕", cls: "badge-rejected" },
};

export default function StatusBadge({ status }) {
  const c = CONFIG[status] ?? CONFIG[STATUS.PENDING];
  return (
    <span className={`badge ${c.cls}`}>
      <span aria-hidden="true">{c.icon}</span> {c.label}
    </span>
  );
}