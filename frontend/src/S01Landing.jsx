export default function S01Landing({ onDonate, onRegisterOrg, onLogin }) {
  return (
    <main style={{
      minHeight: "100vh",
      background: "var(--color-blue-50, #F2F6FD)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)",
      padding: "20px" // Adds a little breathing room on smaller screens
    }}>
      <section style={{
        width: "100%",
        maxWidth: "650px", // INCREASED from 480px to 650px
        background: "var(--color-white, #FFFFFF)",
        borderRadius: "var(--radius-lg, 12px)",
        boxShadow: "var(--shadow-card, 0 10px 25px rgba(15,30,61,.08))", // Slightly deeper shadow for the hero card
        padding: "60px 40px", // INCREASED padding for a grander feel
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "var(--color-ink-900, #0F1E3D)"
      }}>
        
        {/* Bigger Logo Placeholder */}
        <div style={{ fontSize: "80px", marginBottom: "16px", lineHeight: "1" }}>🩸</div>
        
        <h1 style={{ 
          font: "var(--text-display, 700 36px/44px var(--font-sans))", 
          color: "var(--color-blue-600, #1E5BC6)", 
          margin: "0 0 12px 0",
          letterSpacing: "1px"
        }}>
          BLOOD BRIDGE
        </h1>
        
        <p style={{ 
          font: "var(--text-h3, 500 18px/28px var(--font-sans))", 
          color: "var(--color-ink-600, #4B5A78)", 
          marginBottom: "40px" 
        }}>
          Emergency blood, found fast.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "400px" }}>
          
          {/* 1. Donate Button */}
          <button 
            onClick={onDonate}
            style={{
              height: "52px", // Slightly taller for a bigger impact
              borderRadius: "var(--radius-md, 8px)",
              border: "none",
              background: "var(--color-red-600, #D92D20)",
              color: "var(--color-white, #FFFFFF)",
              font: "var(--text-h3, 600 16px/24px var(--font-sans))",
              cursor: "pointer",
              transition: "background 0.2s",
              fontSize: "16px"
            }}
            onMouseOver={(e) => e.target.style.background = "var(--color-red-700, #B42318)"}
            onMouseOut={(e) => e.target.style.background = "var(--color-red-600, #D92D20)"}
          >
            I want to donate
          </button>

          {/* 2. Register Org Button */}
          <button 
            onClick={onRegisterOrg}
            style={{
              height: "52px",
              borderRadius: "var(--radius-md, 8px)",
              border: "none",
              background: "var(--color-blue-600, #1E5BC6)",
              color: "var(--color-white, #FFFFFF)",
              font: "var(--text-h3, 600 16px/24px var(--font-sans))",
              cursor: "pointer",
              transition: "background 0.2s",
              fontSize: "16px"
            }}
            onMouseOver={(e) => e.target.style.background = "var(--color-blue-700, #1747A6)"}
            onMouseOut={(e) => e.target.style.background = "var(--color-blue-600, #1E5BC6)"}
          >
            Hospital / Blood Bank: Register
          </button>

          {/* 3. Login Button */}
          <button 
            onClick={onLogin}
            style={{
              height: "52px",
              borderRadius: "var(--radius-md, 8px)",
              border: "1px solid var(--color-blue-600, #1E5BC6)",
              background: "transparent",
              color: "var(--color-blue-600, #1E5BC6)",
              font: "var(--text-h3, 600 16px/24px var(--font-sans))",
              cursor: "pointer",
              transition: "background 0.2s",
              fontSize: "16px"
            }}
            onMouseOver={(e) => e.target.style.background = "var(--color-blue-50, #F2F6FD)"}
            onMouseOut={(e) => e.target.style.background = "transparent"}
          >
            Login
          </button>

        </div>
      </section>
    </main>
  );
}