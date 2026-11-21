import { useState } from "react";
import OrgRegistration from "./OrgRegistration";
import OrgOtpVerify from "./OrgOtpVerify";
import OrgRegistrationStatus from "./OrgRegistrationStatus";

// FR2.1 flow (Eesha): form -> OTP -> status.
// onExit sends the user back to the landing page (S01).
export default function OrgApp({ onExit }) {
  const [step, setStep] = useState("form"); // "form" | "otp" | "status"
  const [formData, setFormData] = useState(null);
  const [submittedOrg, setSubmittedOrg] = useState(null);

  function exit() {
    setSubmittedOrg(null);
    setFormData(null);
    setStep("form");
    if (onExit) onExit();
  }

    return (
    <>
      {step === "form" && (
        <OrgRegistration
          onBack={exit} // <--- Pass the exit function here
          onSubmitted={(data) => {
            setFormData(data);
            setStep("otp");
          }}
        />
        // Notice I deleted the <div> with the "Back to Home" button here, because it was hidden!
      )}

      {step === "otp" && formData && (
        <OrgOtpVerify
          email={formData.email}
          formData={formData}
          onVerified={(org) => {
            setSubmittedOrg(org);
            setStep("status");
          }}
          onBack={() => setStep("form")}
        />
      )}

      {step === "status" && submittedOrg && (
        <OrgRegistrationStatus 
          org={submittedOrg} 
          onBack={exit} 
          onResubmit={() => setStep("form")} // <--- Allows going back to the form to edit
        />
      )}
    </>
  );
}