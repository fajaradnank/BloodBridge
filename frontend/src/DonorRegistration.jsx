// =====================================================================
// DonorRegistration.jsx
// Feature : FR1 - Donor Registration (Trello card "FR1 Donor registration")
// Wireframe: S02 - Donor sign-up
//
// How registration works now (2 steps on one screen):
//   STEP "form": donor fills the details, solves the reCAPTCHA, clicks
//                "Send verification code" -> Firebase texts a 6-digit OTP.
//   STEP "otp" : donor types the OTP. If it is correct we
//                  1) link the email + password to the verified phone account
//                  2) save the donor profile in Firestore with role = "Donor"
//                  3) send the donor to the home screen (D01)
// =====================================================================

import { useEffect, useRef, useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  EmailAuthProvider,
  linkWithCredential,
  getAdditionalUserInfo,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
  isAvailable: true,   // wireframe: "I am available to donate" ticked by default
  alertConsent: true,  // wireframe: "I agree to receive alerts" ticked by default
};

// ---------------------------------------------------------------------
// toInternationalPhone: Firebase needs the phone as +92XXXXXXXXXX.
// Accepts 03001234567, +923001234567 or 923001234567 (spaces/dashes ignored).
// Returns null if it is not a valid Pakistani mobile number.
// ---------------------------------------------------------------------
function toInternationalPhone(input) {
  const cleaned = input.replace(/[\s\-()]/g, "");
  if (/^03\d{9}$/.test(cleaned)) return "+92" + cleaned.slice(1);
  if (/^\+923\d{9}$/.test(cleaned)) return cleaned;
  if (/^923\d{9}$/.test(cleaned)) return "+" + cleaned;
  return null;
}

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

  // Phone: must be a valid Pakistani mobile number
  if (toInternationalPhone(values.phone) === null) {
    errors.phone = "Enter a valid mobile number, e.g. 03001234567";
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

  return errors;
}

// Used when the page is NOT embedded: onRegistered(name) is given by App.jsx
// and called after a successful sign-up so App.jsx can show the donor home (D01).
function DonorRegistration({ onRegistered }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form");          // "form" or "otp"
  const [otp, setOtp] = useState("");                // the 6-digit code typed by the donor
  const [otpError, setOtpError] = useState("");
  const [formError, setFormError] = useState("");    // general error (e.g. no internet)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaSolved, setCaptchaSolved] = useState(false);

  // GPS coordinates {lat, lng}, or null if the donor typed their area by hand.
  // We keep them SEPARATE from the text so every donor is stored in the same format.
  const [coords, setCoords] = useState(null);

  // useRef = a box that keeps a value between renders without causing a re-draw
  const captchaBoxRef = useRef(null);       // the <div> where reCAPTCHA is drawn
  const captchaWidgetId = useRef(null);     // lets us reset the CAPTCHA after a failure
  const captchaVerifierRef = useRef(null);  // the Firebase reCAPTCHA object
  const confirmationRef = useRef(null);     // remembers the "code was sent" result
  // A donor whose phone is verified but whose profile is NOT saved yet.
  // If saving fails we keep them here, so "try again" does not need a new OTP.
  const pendingUserRef = useRef(null);

  // Draw the reCAPTCHA whenever the form step is shown.
  useEffect(() => {
    if (step !== "form" || !captchaBoxRef.current) return;

    try {
      const verifier = new RecaptchaVerifier(auth, captchaBoxRef.current, {
        size: "normal",
        callback: () => setCaptchaSolved(true),          // donor solved it
        "expired-callback": () => setCaptchaSolved(false), // it timed out
      });
      captchaVerifierRef.current = verifier;
      verifier.render().then((id) => {
        captchaWidgetId.current = id;
      });

      // Cleanup: remove the CAPTCHA when leaving this step
      return () => {
        verifier.clear();
        setCaptchaSolved(false);
      };
    } catch (error) {
      console.error("Could not show reCAPTCHA:", error);
      setFormError("Could not load the CAPTCHA. Please refresh the page.");
    }
  }, [step]);

  // A CAPTCHA token can be used only once, so reset it after any failure.
  function resetCaptcha() {
    if (window.grecaptcha && captchaWidgetId.current !== null) {
      window.grecaptcha.reset(captchaWidgetId.current);
    }
    setCaptchaSolved(false);
  }

  // Runs every time the user types in a field or ticks a checkbox.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    if (name === "location") {
      setCoords(null); // the donor edited the place by hand, so old GPS coordinates are no longer correct
    }
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
        // Rounded to 4 decimals (about 11 metres): precise enough for matching, less exact for privacy
        setCoords({ lat: Number(latitude.toFixed(4)), lng: Number(longitude.toFixed(4)) });
        setValues((old) => ({ ...old, location: "Current location (GPS)" }));
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

  // ---------------------------------------------------------------
  // STEP 1: validate the form, check the CAPTCHA, send the SMS code.
  // ---------------------------------------------------------------
  async function handleSendCode(event) {
    event.preventDefault();
    setFormError("");

    const foundErrors = validateForm(values);
    if (!captchaSolved) {
      foundErrors.captcha = "Please complete the CAPTCHA";
    }
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      // Firebase checks the CAPTCHA and texts a 6-digit code to the phone
      confirmationRef.current = await signInWithPhoneNumber(
        auth,
        toInternationalPhone(values.phone),
        captchaVerifierRef.current
      );
      setOtp("");
      setOtpError("");
      setStep("otp"); // show the "enter your code" screen
    } catch (error) {
      resetCaptcha();
      if (error.code === "auth/invalid-phone-number") {
        setErrors({ phone: "This phone number is not valid." });
      } else if (error.code === "auth/too-many-requests") {
        setFormError("Too many attempts. Please wait a while and try again.");
      } else if (error.code === "auth/network-request-failed") {
        setFormError("No internet connection. Please try again.");
      } else if (error.code === "auth/billing-not-enabled") {
        setFormError("SMS is not enabled for this project yet (see Firebase plan).");
      } else {
        console.error("Could not send code:", error);
        setFormError("Could not send the code. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------
  // STEP 2: check the OTP, then create the donor's account + profile.
  // ---------------------------------------------------------------
  async function handleVerifyCode(event) {
    event.preventDefault();
    setFormError("");

    if (!/^\d{6}$/.test(otp)) {
      setOtpError("Enter the 6-digit code");
      return;
    }

    setIsSubmitting(true);
    let createdNow = false; // true if this phone account was created just now

    try {
      // A donor who is already verified (a previous save failed) skips the code check.
      let user = pendingUserRef.current;

      if (!user) {
        // 1) Firebase checks the code. A wrong code throws an error.
        const result = await confirmationRef.current.confirm(otp);
        user = result.user;
        createdNow = getAdditionalUserInfo(result)?.isNewUser ?? false;

        // 2) If this phone already had an account WITH a donor profile,
        //    it is a duplicate (FR1: duplicate phone is rejected).
        if (!createdNow) {
          const existing = await getDoc(doc(db, "users", user.uid));
          if (existing.exists()) {
            await signOut(auth);
            setStep("form");
            setErrors({ phone: "This phone number is already registered." });
            return;
          }
        }

        // 3) Add the email + password to this verified phone account.
        //    Throws "auth/email-already-in-use" if the email belongs to someone else.
        try {
          await linkWithCredential(
            user,
            EmailAuthProvider.credential(values.email.trim(), values.password)
          );
        } catch (linkError) {
          // Already linked from an earlier half-finished attempt: that is fine.
          if (linkError.code !== "auth/provider-already-linked") throw linkError;
        }

        // Phone + email are ready. Remember the donor until the profile is saved.
        pendingUserRef.current = user;
      }

      // 4) Save the donor profile in Firestore with role = "Donor".
      //    We never save the password.
      //    If this step fails, the account exists but has no profile. We do NOT
      //    lose the donor: we show a clear message and keep pendingUserRef, so
      //    pressing the button again only retries the save (no new OTP needed).
      try {
        await setDoc(doc(db, "users", user.uid), {
          name: values.name.trim(),
          phone: toInternationalPhone(values.phone),
          email: values.email.trim(),
          bloodGroup: values.bloodGroup,
          // Same shape for EVERY donor, so distance matching can use it later:
          //   text = what the donor typed (or "Current location (GPS)")
          //   lat / lng = numbers from GPS, or null if typed by hand
          location: {
            text: values.location.trim(),
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
          },
          isAvailable: values.isAvailable,
          // SRS keeps SMS and email preferences separate (FR5 lets the donor change them later).
          // The sign-up screen has ONE checkbox, so both start with the same value.
          smsAlerts: values.alertConsent,
          emailAlerts: values.alertConsent,
          role: "Donor",
          createdAt: serverTimestamp(),
        });
      } catch (saveError) {
        console.error("Profile save failed:", saveError);
        setFormError(
          "Your phone is verified, but we could not save your profile. " +
            "Check your internet and press the button again."
        );
        return; // stay on this screen so the donor can retry
      }

      // 5) Done: clear everything and send the donor to the home screen (D01)
      const donorName = values.name.trim(); // save before clearing
      pendingUserRef.current = null;
      setValues(EMPTY_FORM);
      setCoords(null);
      if (onRegistered) {
        onRegistered(donorName);
      }
    } catch (error) {
      if (error.code === "auth/invalid-verification-code") {
        setOtpError("Wrong code. Please check the SMS and try again.");
      } else if (error.code === "auth/code-expired") {
        setOtpError("This code has expired. Go back and request a new one.");
      } else if (error.code === "auth/email-already-in-use") {
        // Undo the phone account we just made so the phone can be used again
        if (createdNow && auth.currentUser) {
          await auth.currentUser.delete();
        } else {
          await signOut(auth);
        }
        setStep("form");
        setErrors({ email: "This email is already registered. Please log in instead." });
      } else if (error.code === "auth/network-request-failed") {
        setFormError("No internet connection. Please try again.");
      } else {
        console.error("Registration failed:", error);
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ===============================================================
  // SCREEN 2: enter the OTP
  // ===============================================================
  if (step === "otp") {
    return (
      <div className="donor-page">
        <form className="donor-card" onSubmit={handleVerifyCode} noValidate>
          <h1 className="donor-title">Enter your code</h1>
          <p className="donor-hint">
            We sent a 6-digit code by SMS to {values.phone}.
          </p>

          <div className="donor-field">
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
            />
            {otpError && <span className="donor-error">{otpError}</span>}
          </div>

          {formError && <p className="donor-error">{formError}</p>}

          <button type="submit" className="donor-primary-btn" disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify and create account"}
          </button>
          <button
            type="button"
            className="donor-link-btn"
            onClick={() => {
              setStep("form"); // go back, details are kept
              setFormError("");
              pendingUserRef.current = null; // start the verification again
            }}
          >
            Back
          </button>
        </form>
      </div>
    );
  }

  // ===============================================================
  // SCREEN 1: the registration form
  // ===============================================================
  return (
    <div className="donor-page">
      <form className="donor-card" onSubmit={handleSendCode} noValidate>
        <h1 className="donor-title">Become a donor</h1>

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

        {/* ---------- Real reCAPTCHA (Google draws it inside this box) ---------- */}
        <div className="donor-field" style={{ marginTop: "8px" }}>
          <div ref={captchaBoxRef}></div>
          {errors.captcha && <span className="donor-error">{errors.captcha}</span>}
        </div>

        {/* General error (e.g. no internet) */}
        {formError && <p className="donor-error">{formError}</p>}

        {/* ---------- Submit (disabled while waiting for Firebase) ---------- */}
        <button type="submit" className="donor-primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Sending code..." : "Send verification code"}
        </button>
      </form>
    </div>
  );
}

export default DonorRegistration;
