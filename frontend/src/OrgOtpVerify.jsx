import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import "./OrgRegistration.css";

// ---- Cloudinary upload (same as your old working code) ----
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body }
  );
  if (!res.ok) throw new Error("upload-failed");
  const data = await res.json();
  return data.secure_url;
}

const AUTH_ERRORS = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Use at least 8 characters.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
};

export default function OrgOtpVerify({ email, formData, onVerified, onBack }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;
    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    const enteredOtp = otp.join("");
    const savedOtp = sessionStorage.getItem("orgOtp");

    if (enteredOtp !== savedOtp) {
      setError("Invalid OTP. Please check your email and try again.");
      return;
    }

    setLoading(true);

    try {
      // 1. Upload documents to Cloudinary -> [{ name, url }]
      const documents = [];
      for (const f of formData.files || []) {
        const url = await uploadToCloudinary(f);
        documents.push({ name: f.name, url });
      }

      // 2. Create the login in Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      // 3. Save the organization in Firestore
      await setDoc(doc(db, "organisations", cred.user.uid), {
        name: formData.name.trim(),
        type: formData.type,
        status: "pending",
        createdAt: serverTimestamp(),
        address: formData.address.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        registrationNo: formData.registrationNo.trim(),
        licenseNo: formData.licenseNo.trim(),
        contactPerson: formData.contactPerson.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        documents,
        rejectionReason: null,
      });

      sessionStorage.removeItem("orgOtp");
      onVerified({ name: formData.name.trim(), status: "pending" });
    } catch (err) {
      console.error(err);
      if (err.message === "upload-failed") {
        setError("Document upload failed. Go back, check the files and try again.");
      } else {
        setError(AUTH_ERRORS[err.code] || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="org-page">
      <form className="org-card" onSubmit={handleVerify}>
        <h1>Verify your email</h1>
        <p className="org-sub">Enter the 6-digit code sent to <strong>{email}</strong></p>

        {error && <div className="org-banner-error" role="alert">{error}</div>}

        <div className="org-otp-container">
          {otp.map((data, index) => (
            <input
              className="org-otp-input"
              type="text"
              name="otp"
              maxLength="1"
              key={index}
              value={data}
              onChange={(e) => handleChange(e.target, index)}
              onFocus={(e) => e.target.select()}
            />
          ))}
        </div>

        <button className="org-btn" type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify & Create Account"}
        </button>

        <button type="button" className="org-btn org-btn-secondary" onClick={onBack} style={{ marginTop: "10px" }}>
          Back to form
        </button>
      </form>
    </main>
  );
}