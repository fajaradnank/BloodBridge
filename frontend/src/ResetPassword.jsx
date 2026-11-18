
import { useEffect, useState } from "react";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "./firebase";
import "./Login.css";

function ResetPassword({ onBack }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [success, setSuccess] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const actionCode = params.get("oobCode");
  const mode = params.get("mode");

  useEffect(() => {
    async function verifyLink() {
      if (mode !== "resetPassword" || !actionCode) {
        setError("This password reset link is invalid or incomplete.");
        return;
      }

      try {
        await verifyPasswordResetCode(auth, actionCode);
        setVerified(true);
      } catch (err) {
        console.error("Reset link verification failed:", err);
        setError(
          "This password reset link has expired or has already been used. Please request a new link."
        );
      }
    }

    verifyLink();
  }, [actionCode, mode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!verified || !actionCode) {
      setError("Please request a new password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, actionCode, password);
      setSuccess(true);

      // Remove the one-time reset code from the address bar.
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    } catch (err) {
      console.error("Password reset failed:", err);

      if (
        err.code === "auth/expired-action-code" ||
        err.code === "auth/invalid-action-code"
      ) {
        setError(
          "This reset link has expired or has already been used. Please request a new one."
        );
      } else if (err.code === "auth/weak-password") {
        setError("Please choose a stronger password.");
      } else {
        setError("Unable to reset your password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-heading">
            <h1>Password Reset Successful</h1>
            <p>
              Your password has been updated.
              You can now log in using your new password.
            </p>
          </div>

          <button
            type="button"
            className="login-submit"
            onClick={onBack}
          >
            Back to Login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-heading">
          <h1>Set New Password</h1>
          <p>Enter and confirm your new password below.</p>
        </div>

        {!verified && !error ? (
          <p>Verifying your reset link...</p>
        ) : null}

        {verified && (
          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            <div className="login-field">
              <label htmlFor="new-password">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="confirm-password">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save New Password"}
            </button>
          </form>
        )}

        {!verified && error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}

        <div className="login-register">
          <button type="button" onClick={onBack}>
            Back to Login
          </button>
        </div>
      </section>
    </main>
  );
}

export default ResetPassword;
