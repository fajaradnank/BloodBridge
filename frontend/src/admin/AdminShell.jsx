import { useState } from "react";
import { signOut } from "firebase/auth";
import { Menu, Bell, CircleUser, ClipboardCheck, LogOut } from "lucide-react";
import { auth } from "../firebase";
import "../styles/tokens.css";
import "./Admin.css";

export default function AdminShell({ pendingCount = 0, onLogout, children }) {
      const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

    async function logout() {
    try {
      if (onLogout) await onLogout();
      else await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="shell">
      <header className="shell-topbar">
        <button
          className="icon-btn menu-btn"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <span className="shell-title">BloodBridge Admin</span>

        <div className="topbar-actions">
          <button
            className="icon-btn"
            aria-label="Notifications"
            title="Notifications (S08) are not built yet"
            disabled
          >
            <Bell size={20} aria-hidden="true" />
          </button>
          <div className="profile">
            <button
              className="icon-btn"
              aria-label="Profile menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((o) => !o)}
            >
              <CircleUser size={24} aria-hidden="true" />
            </button>
            {profileOpen && (
              <div className="profile-menu">
                Signed in as <strong>{auth.currentUser?.email ?? "admin"}</strong>
              </div>
            )}
          </div>
        </div>
      </header>

      {menuOpen && <div className="shell-backdrop" onClick={() => setMenuOpen(false)} />}

      <nav className={`shell-sidebar ${menuOpen ? "open" : ""}`} aria-label="Admin navigation">
        <a href="/admin" className="nav-item active" aria-current="page">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span className="nav-label">Approvals</span>
          {pendingCount > 0 && (
            <>
              {" "}
              <span className="count-badge">{pendingCount}</span>
            </>
          )}
        </a>
        <button className="nav-item" onClick={logout}>
          <LogOut size={20} aria-hidden="true" />
          <span className="nav-label">Log out</span>
        </button>
      </nav>

      <main className="shell-main">{children}</main>
    </div>
  );
}