// =====================================================================
// DonorHome.jsx
// Screen   : D01 - Donor home (wireframe D01)
// Used by  : FR1 criterion 7 (donor is sent here after registering)
//
// This is a SIMPLE first version: greeting + the "no alerts" empty state.
// Later cards will add the Receive Alerts switch, the alert list and the sidebar.
// =====================================================================

import "./DonorHome.css";

// name: the donor's name, passed in from App.jsx
function DonorHome({ name }) {
  return (
    <div className="home-page">
      <div className="home-card">
        {/* Wireframe D01 greets the donor: "Hi Ayesha," */}
        <h1 className="home-title">Hi {name},</h1>
        <p className="home-welcome">Your donor account is ready.</p>

        {/* Section: alerts that need an answer (empty for a brand new donor) */}
        <h2 className="home-heading">Alerts needing a response (0)</h2>
        <div className="home-empty">
          <strong>No alerts right now</strong>
          <p>We will let you know if someone nearby needs your blood group.</p>
        </div>

        <h2 className="home-heading">Accepted alerts (0)</h2>
      </div>
    </div>
  );
}

export default DonorHome;
