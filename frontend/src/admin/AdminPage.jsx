import AdminGuard from "./AdminGuard";
import AdminApprovals from "./AdminApprovals";

export default function AdminPage({ onLogout }) {
  return (
    <AdminGuard onLogout={onLogout}>
      <AdminApprovals onLogout={onLogout} />
    </AdminGuard>
  );
}