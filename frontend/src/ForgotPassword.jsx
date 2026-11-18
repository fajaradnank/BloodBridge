
import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";
import "./Login.css";

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      setSent(true);
      setCountdown(60);
    } catch (err) {
      console.error("Password reset request:", err);

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        // Keep the same confirmation message for privacy.
        setSent(true);
        setCountdown(60);
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Unable to send the reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || loading) return;

    setError("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setCountdown(60);
    } catch (err) {
      console.error("Resend password reset:", err);

      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        setCountdown(60);
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Unable to resend the link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        {!sent ? (
          <>
            <div className="login-heading">
              <h1>Forgot Password?</h1>
              <p>
                Enter your email address and we'll send you
                a link to reset your password.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              <div className="login-field">
                <label htmlFor="reset-email">
                  Email address
                </label>

                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
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
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <div className="login-register">
              <button type="button" onClick={onBack}>
                Back to Login
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="login-heading">
              <h1>Check your email</h1>
              <p>
                If an account exists for {email.trim()},
                you will receive a password reset link.
                Please check your inbox and spam folder.
              </p>
            </div>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className="login-submit"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
            >
              {loading
                ? "Sending..."
                : countdown > 0
                ? `Resend link in ${countdown}s`
                : "Resend Link"}
            </button>

            <div className="login-register">
              <button type="button" onClick={onBack}>
                Back to Login
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default ForgotPassword;
