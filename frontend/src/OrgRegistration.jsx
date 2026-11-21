import emailjs from '@emailjs/browser';
import { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "./firebase";
import "./OrgRegistration.css";

const PHONE_RE = /^(\+92[\s-]?|0)3\d{2}[\s-]?\d{7}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
  name: "", type: "", registrationNo: "", licenseNo: "", address: "",
  contactPerson: "", accountHolderName: "", email: "", password: "", phone: "",
};

function validateField(key, value) {
  const v = String(value).trim();
  switch (key) {
    case "name": return v ? "" : "Enter the organization name";
    case "type": return v ? "" : "Choose Hospital or Blood bank";
    case "registrationNo": return v ? "" : "Enter the registration number";
    case "licenseNo": return v ? "" : "Enter the license number";
    case "address": return v ? "" : "Enter the address";
    case "contactPerson": return v ? "" : "Enter the contact person's name";
    case "accountHolderName": return v ? "" : "Enter the account holder's name";
    case "email": return EMAIL_RE.test(v) ? "" : "Enter a valid email address";
    case "phone": return PHONE_RE.test(v) ? "" : "Enter a valid phone, e.g. 0300-0000000";
    case "password": return value.length >= 8 ? "" : "Use at least 8 characters";
    default: return "";
  }
}

export default function OrgRegistration({ onSubmitted, onBack }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [captchaSolved, setCaptchaSolved] = useState(false);

  const captchaBoxRef = useRef(null);
  const captchaWidgetId = useRef(null);
  const captchaVerifierRef = useRef(null);

  useEffect(() => {
    if (!captchaBoxRef.current || captchaVerifierRef.current) return;

    try {
      const verifier = new RecaptchaVerifier(auth, captchaBoxRef.current, {
        size: "normal",
        callback: () => setCaptchaSolved(true),
        "expired-callback": () => setCaptchaSolved(false),
      });
      
      captchaVerifierRef.current = verifier;
      
      verifier.render().then((id) => {
        captchaWidgetId.current = id;
      });

      return () => {
        verifier.clear();
        captchaVerifierRef.current = null;
      };
    } catch (error) {
      console.error("Could not show reCAPTCHA:", error);
      setSubmitError("Could not load the CAPTCHA. Please refresh.");
    }
  }, []);

  const setValue = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const onBlur = (key) => setErrors((e) => ({ ...e, [key]: validateField(key, form[key]) }));

  function addFiles(list) {
    const next = [...files];
    let problem = "";
    for (const f of Array.from(list)) {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) problem = `${f.name}: only PDF, JPG or PNG allowed`;
      else if (f.size > 5 * 1024 * 1024) problem = `${f.name}: larger than 5 MB`;
      else next.push(f);
    }
    setFiles(next);
    setFileError(problem);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    const newErrors = {};
    Object.keys(EMPTY).forEach((k) => { newErrors[k] = validateField(k, form[k]); });
    if (!captchaSolved) newErrors.captcha = "Please complete the CAPTCHA";
    
    setErrors(newErrors);
    const missingFile = files.length === 0;
    if (missingFile) setFileError("Upload at least one document");
    if (Object.values(newErrors).some(Boolean) || missingFile) return;

    setLoading(true);

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      await emailjs.send(
        "service_rmd7dvp",   
        "template_qtb1v9o",   
        {
          to_email: form.email,
          otp_code: generatedOtp,
        },
        "DEvxjy4gzFkOZ1I6b"     
      );

      sessionStorage.setItem("orgOtp", generatedOtp);
      onSubmitted({ ...form, files });

    } catch (err) {
      console.error("EmailJS Error:", err);
      setSubmitError(err.text || "Failed to send OTP. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  const Field = ({ id, label, type = "text", hint, children }) => (
    <div className={`org-field ${errors[id] ? "org-has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children || (
        <input id={id} type={type} value={form[id]} onChange={(e) => setValue(id, e.target.value)} onBlur={() => onBlur(id)} />
      )}
      {hint && !errors[id] && <div className="org-hint">{hint}</div>}
      {errors[id] && <div className="org-err" role="alert">{errors[id]}</div>}
    </div>
  );

  return (
    <main className="org-page">
      <form className="org-card" onSubmit={handleSubmit} noValidate>
        
        {/* The ONLY change: Back button added here */}
        <button 
          type="button" 
          onClick={onBack} 
          style={{ background: "none", border: "none", color: "var(--color-blue-600)", cursor: "pointer", marginBottom: "16px", padding: 0, fontWeight: "bold" }}
        >
          &larr; Back to Home
        </button>

        <h1>Register your organization</h1>
        
        {submitError && <div className="org-banner-error" role="alert">{submitError}</div>}

        {Field({ id: "name", label: "Organization name" })}
        {Field({ id: "type", label: "Type", children: (
          <select id="type" value={form.type} onChange={(e) => setValue("type", e.target.value)} onBlur={() => onBlur("type")}>
            <option value="">Select type</option>
            <option value="hospital">Hospital</option>
            <option value="bloodbank">Blood bank</option>
          </select>
        ) })}
        {Field({ id: "registrationNo", label: "Registration number" })}
        {Field({ id: "licenseNo", label: "License number" })}
        {Field({ id: "address", label: "Address" })}
        {Field({ id: "contactPerson", label: "Contact person" })}
        {Field({ id: "accountHolderName", label: "Account holder name" })}
        {Field({ id: "email", label: "Official email", type: "email", hint: "You will use this email to log in." })}
        {Field({ id: "phone", label: "Contact phone", type: "tel", hint: "For example 0300-0000000" })}
        {Field({ id: "password", label: "Password", hint: "At least 8 characters", children: (
          <div className="org-pw-row">
            <input id="password" type={showPw ? "text" : "password"} value={form.password}
              onChange={(e) => setValue("password", e.target.value)} onBlur={() => onBlur("password")} />
            <button type="button" onClick={() => setShowPw((s) => !s)}>{showPw ? "Hide" : "Show"}</button>
          </div>
        ) })}

        <div className={`org-field ${fileError ? "org-has-error" : ""}`}>
          <label htmlFor="docs">Documents (license or lease)</label>
          <label className="org-drop">
            Choose files (PDF, JPG or PNG, up to 5 MB each)
            <input id="docs" type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          </label>
          {files.map((f, i) => (
            <div className="org-file-row" key={f.name + i}>
              <span>{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          {fileError && <div className="org-err" role="alert">{fileError}</div>}
        </div>

        <div className="org-field" style={{ display: 'flex', justifyContent: 'center' }}>
          <div ref={captchaBoxRef}></div>
          {errors.captcha && <div className="org-err" role="alert">{errors.captcha}</div>}
        </div>

        <button className="org-btn" type="submit" disabled={loading}>
          {loading ? "Processing..." : "Send OTP"}
        </button>
      </form>
    </main>
  );
}