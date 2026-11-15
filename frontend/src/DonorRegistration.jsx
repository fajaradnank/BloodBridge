// =====================================================================
// DonorRegistration.jsx
// Feature : FR1 - Donor Registration (Trello card "FR1 Donor registration")
// Wireframe: S02 - Donor sign-up
//
// What this file does:
//   - Shows ONE simple form where a new donor enters their details
//   - Checks (validates) every field and shows a clear error message
//   - On success, shows a success message using design tokens
//
// What this file does NOT do yet (comes in the next sprint tasks):
//   - Firebase Authentication (creating the real account)
//   - Firestore (saving the donor profile with role = "Donor")
//   - Duplicate email/phone check, redirect to donor home (D01)
// =====================================================================

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import "./DonorRegistration.css";

// The only blood groups allowed (Trello acceptance criteria).
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// The empty form. We use this at the start and to reset after success.
const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  password: "",
  bloodGroup: "",
  location: "",
  isAvailable: true,   // wireframe shows "I am available to donate" ticked by default
  alertConsent: true,  // wireframe shows "I agree to receive alerts" ticked by default
  notARobot: false,    // CAPTCHA check
};

// ---------------------------------------------------------------------
// validateForm: takes the form values and returns an object of errors.
// If the object is empty ({}), the form is valid.
// ---------------------------------------------------------------------
function validateForm(values) {
  const errors = {};

  // Name: required, at least 2 characters
  if (values.name.trim().length < 2) {
    errors.name = "Full name is required (at least 2 characters)";
  }

  // Phone: remove spaces/dashes/+, then it must be 10 to 13 digits only
  const digitsOnly = values.phone.replace(/[\s\-+]/g, "");
  if (!/^\d{10,13}$/.test(digitsOnly)) {
    errors.phone = "Enter a valid phone number (10 to 13 digits)";
  }

  // Email: simple pattern -> something@something.something
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  // Password: at least 8 characters
  if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  // Blood group: must be one of the 8 valid options
  if (!BLOOD_GROUPS.includes(values.bloodGroup)) {
    errors.bloodGroup = "Please select your blood group";
  }

  // Location: required (area or city)
  if (values.location.trim() === "") {
    errors.location = "Please enter your area or city";
  }

  // CAPTCHA check validation
  if (!values.notARobot) {
    errors.notARobot = "Please confirm you are not a robot";
  }

  return errors;
}

function DonorRegistration() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // true while Firebase is working
  const [formError, setFormError] = useState("");          // general error shown above the button

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues({
      ...values,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  // "Use my location" button: asks the browser for the device location (once).
  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setErrors({ ...errors, location: "Location is not supported on this device" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setValues((old) => ({
          ...old,
          location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        }));
        setErrors((old) => ({ ...old, location: undefined }));
      },
      () => {
        setErrors((old) => ({
          ...old,
          location: "Could not get your location. Please type your area or city",
        }));
      }
    );
  }

  // async = this function waits for Firebase (internet) before moving on
  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const foundErrors = validateForm(values);
    setErrors(foundErrors);

    if (Object.keys(foundErrors).length > 0) {
      setSubmitted(false);
      return;
    }

    setIsSubmitting(true);
    let newUser = null; // remembered so we can undo it if a later step fails

    try {
      // STEP 1 (FR1 criterion 4): create the login account in Firebase Authentication.
      // If the email is already used, Firebase throws "auth/email-already-in-use".
      const credential = await createUserWithEmailAndPassword(
        auth,
        values.email.trim(),
        values.password
      );
      newUser = credential.user;

      // Phone saved as digits only, e.g. "+92 300-1234567" -> "923001234567"
      const phoneDigits = values.phone.replace(/[\s\-+]/g, "");

      // STEP 2 (FR1 criterion 5): save the donor profile in Firestore with role = "Donor".
      // We write two documents together (a "batch"): both succeed or both fail.
      //   users/{uid}      -> the donor profile
      //   phones/{digits}  -> a marker so the same phone cannot register twice
      // (criterion 6: if phones/{digits} already exists, Firestore rejects the batch)
      const batch = writeBatch(db);
      batch.set(doc(db, "users", newUser.uid), {
        name: values.name.trim(),
        phone: phoneDigits,
        email: values.email.trim(),
        bloodGroup: values.bloodGroup,
        location: values.location.trim(),
        isAvailable: values.isAvailable,
        alertConsent: values.alertConsent,
        role: "Donor",
        createdAt: serverTimestamp(),
      });
      batch.set(doc(db, "phones", phoneDigits), { uid: newUser.uid });
      await batch.commit();

      setSubmitted(true);
      setValues(EMPTY_FORM);
      // TODO (criterion 7): redirect to the donor home screen (D01)
    } catch (error) {
      setSubmitted(false);

      if (error.code === "auth/email-already-in-use") {
        // Duplicate email (criterion 6)
        setErrors({ email: "This email is already registered. Please log in instead." });
      } else if (error.code === "auth/weak-password") {
        setErrors({ password: "Password is too weak. Use at least 8 characters." });
      } else if (error.code === "auth/network-request-failed") {
        setFormError("No internet connection. Please try again.");
      } else if (newUser && error.code === "permission-denied") {
        // The login account was created but the phone already exists, so the Firestore
        // write was refused (criterion 6). Delete the half-created account so the
        // person can try again with another phone number.
        await newUser.delete();
        setErrors({ phone: "This phone number is already registered." });
      } else {
        console.error("Registration failed:", error);
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false); // always re-enable the button
    }
  }

  return (
    <div className="donor-page">
      <form className="donor-card" onSubmit={handleSubmit} noValidate>
        <h1 className="donor-title">Become a donor</h1>

        {/* Success message using design tokens (Blue tint, no green per UI guide) */}
        {submitted && (
          <p className="donor-success" role="status">
            Donor registered successfully!
          </p>
        )}

        {/* ---------- Full name ---------- */}
        <div className="donor-field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={values.name}
            onChange={handleChange}
            placeholder="e.g. Ayesha Khan"
          />
          {errors.name && <span className="donor-error">{errors.name}</span>}
        </div>

        {/* ---------- Phone ---------- */}
        <div className="donor-field">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={handleChange}
            placeholder="e.g. 03001234567"
          />
          {errors.phone && <span className="donor-error">{errors.phone}</span>}
        </div>

        {/* ---------- Email ---------- */}
        <div className="donor-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            placeholder="e.g. ayesha@gmail.com"
          />
          {errors.email && <span className="donor-error">{errors.email}</span>}
        </div>

        {/* ---------- Password ---------- */}
        <div className="donor-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            placeholder="At least 8 characters"
          />
          {errors.password && <span className="donor-error">{errors.password}</span>}
        </div>

        {/* ---------- Blood group (dropdown) ---------- */}
        <div className="donor-field">
          <label htmlFor="bloodGroup">Blood group</label>
          <select
            id="bloodGroup"
            name="bloodGroup"
            value={values.bloodGroup}
            onChange={handleChange}
          >
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          {errors.bloodGroup && <span className="donor-error">{errors.bloodGroup}</span>}
        </div>

        {/* ---------- Location ---------- */}
        <div className="donor-field">
          <label htmlFor="location">Area / city</label>
          <div className="donor-location-row">
            <input
              id="location"
              name="location"
              type="text"
              value={values.location}
              onChange={handleChange}
              placeholder="e.g. Gulshan, Karachi"
            />
            <button type="button" className="donor-secondary-btn" onClick={handleUseMyLocation}>
              Use my location
            </button>
          </div>
          {errors.location && <span className="donor-error">{errors.location}</span>}
        </div>

        {/* ---------- Checkboxes ---------- */}
        <label className="donor-checkbox">
          <input
            type="checkbox"
            name="isAvailable"
            checked={values.isAvailable}
            onChange={handleChange}
          />
          I am available to donate
        </label>

        <label className="donor-checkbox">
          <input
            type="checkbox"
            name="alertConsent"
            checked={values.alertConsent}
            onChange={handleChange}
          />
          I agree to receive alerts by SMS / email
        </label>

        {/* ---------- CAPTCHA Placeholder (CR-01) ---------- */}
        <div className="donor-field" style={{ marginTop: "8px" }}>
          <label className="donor-checkbox">
            <input
              type="checkbox"
              name="notARobot"
              checked={values.notARobot}
              onChange={handleChange}
            />
            I am not a robot (CAPTCHA)
          </label>
          {errors.notARobot && <span className="donor-error">{errors.notARobot}</span>}
        </div>

        {/* General error (e.g. no internet) */}
        {formError && <p className="donor-error">{formError}</p>}

        {/* ---------- Submit (disabled while waiting for Firebase) ---------- */}
        <button type="submit" className="donor-primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </div>
  );
}

export default DonorRegistration;