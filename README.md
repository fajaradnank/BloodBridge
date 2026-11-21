# BloodBridge

**Hospital Blood Resource & Emergency Donor Coordination Platform**

BloodBridge is a web platform that helps hospitals find compatible blood donors and nearby blood bank stock during an emergency. Donors register once, hospitals and blood banks sign up and are verified by a platform admin, and each role sees only the features it is allowed to use.

> **Status:** Sprint 1 complete (accounts, approvals and access control). Emergency requests, donor matching and notifications are planned for the next sprints.

## Table of contents

- [Features](#features)
- [Roles and access](#roles-and-access)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Firebase setup](#firebase-setup)
- [Data model](#data-model)
- [Firestore security rules](#firestore-security-rules)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)

## Features

### Sprint 1

**Donor registration (FR1)**
- Single registration form: name, phone, email, password, blood group and location.
- Location can be typed as an area or city, or captured once from the device (GPS).
- Phone ownership is verified with a 6-digit SMS code, protected by reCAPTCHA.
- Duplicate emails and phone numbers are rejected.
- The donor profile is saved in Firestore with the role `Donor`. The password is never stored there.

**Hospital and blood bank registration (FR2.1)**
- Sign-up form with organization name, type, registration number, license number, address, contact person, account holder name, official email, phone and password.
- License or lease documents (PDF or image, up to 5 MB each) are uploaded to Cloudinary and stored as links.
- The official email is verified with a 6-digit code before the account is created.
- New organizations start with the status `pending` and see a confirmation page with a three-step progress indicator (Submitted, Under review, Approved).

**Admin approvals (FR2.2)**
- Platform admins see a queue of registrations and can open each one for review.
- A registration can be approved or rejected. A rejection records the reason, the reviewer and the time.

**Login and role-based access (FR3)**
- Email and password login with role-based redirects (see [Roles and access](#roles-and-access)).
- Forgot-password and reset-password flow.
- Hospitals and blood banks that are `pending` or `rejected` get a locked screen after login: the request and stock buttons are disabled and no dashboard is shown.
- Access unlocks automatically when an admin approves the organization, with no re-login needed.
- Unrecognized roles, missing profiles and missing organization records are blocked with a clear message.

## Roles and access

| Role | Lands on after login | Notes |
|---|---|---|
| Donor | D01, donor home | Self-registration through the donor form |
| Hospital Admin | HA01 | The organization account created at sign-up |
| Hospital Staff | H01 | Created by the hospital admin (planned, FR4) |
| Blood Bank Staff | B01 | The blood bank account created at sign-up |
| Platform Admin | A01, approvals queue | Created manually (see [Firebase setup](#firebase-setup)) |

Each role can open only its own screens. Hospitals and blood banks must be **approved** by a platform admin before they can create or fulfil requests.

## Tech stack

| Area | Tools |
|---|---|
| Frontend | React 19, Vite 8, lucide-react icons |
| Authentication and database | Firebase Authentication (email and password, phone) and Cloud Firestore |
| Document uploads | Cloudinary (unsigned upload preset) |
| Organization email verification | EmailJS |
| Testing and linting | Vitest, Testing Library, jsdom, ESLint |
| Planned deployment | Vercel and Firebase |

## Project structure

```
BloodBridge/
├── firebase.json
├── .firebaserc
├── firestore.rules                   # Firestore security rules
└── frontend/
    ├── .env.example                  # environment variable names
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx                   # screen routing, login redirect, role-based access control
        ├── firebase.js               # Firebase app, auth and Firestore
        ├── S01Landing.jsx            # landing page
        ├── Login.jsx
        ├── ForgotPassword.jsx
        ├── ResetPassword.jsx
        ├── DonorRegistration.jsx     # donor sign-up (FR1)
        ├── DonorHome.jsx             # donor home (D01)
        ├── OrgApp.jsx                # organization sign-up flow: form, OTP, status
        ├── OrgRegistration.jsx       # organization sign-up form (S03)
        ├── OrgOtpVerify.jsx          # email code check, document upload, account creation
        ├── OrgRegistrationStatus.jsx # status page shown right after sign-up (S04)
        ├── admin/                    # platform admin area (A01): queue, review, guard, shell 
        │   ├── Admin.css
        │   ├── AdminApprovals.jsx
        │   ├── AdminApprovals.test.jsx
        │   ├── AdminGuard.jsx
        │   ├── AdminGuard.test.jsx
        │   ├── AdminPage.jsx
        │   ├── AdminReviewOrganization.jsx
        │   ├── AdminShell.jsx
        │   ├── adminUtils.js
        │   ├── adminUtils.test.js
        │   └── StatusBadge.jsx
        ├── features/
        │   └── auth/
        │       ├── LockedDashboard.jsx  # locked screen for unapproved organizations
        │       └── S04RegistrationStatus.jsx
        └── styles/
            └── tokens.css            # design tokens
```

## Getting started

**Prerequisites:** a current Node.js LTS release (20.19 or newer) and npm.

```bash
git clone https://github.com/fajaradnank/BloodBridge.git
cd BloodBridge/frontend
npm install
cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
# fill in the values in .env (see below)
npm run dev
```

The app runs at <http://localhost:5173>.

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the unit tests once (Vitest) |

### Environment variables

Create `frontend/.env` (it is git-ignored, never commit it). The variable names are in `frontend/.env.example`:

| Variable | Purpose |
|---|---|
| `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | An **unsigned** upload preset (Cloudinary Settings > Upload > Upload presets) |
| EmailJS keys | Service ID, template ID and public key used to send the organization verification code (see `.env.example` for the exact names) |

Restart `npm run dev` after changing `.env`.

## Firebase setup

The Firebase project configuration is in `frontend/src/firebase.js`. To run against your own Firebase project, replace the values there.

1. **Authentication:** enable the **Email/Password** and **Phone** sign-in providers. For testing, add phone test numbers (for example +92 345 1234567 and +92 346 1234567, with the code `123456`) under Authentication > Sign-in method > Phone.
2. **Firestore:** create a Cloud Firestore database.
3. **Rules:** publish `firestore.rules` (see below).
4. **Platform admin:** admins are created manually. Add a user in Authentication > Users, copy the User UID, then create a document in Firestore at `users/{UID}` with the fields `name` (string) and `role` (string) = `platformAdmin`.

## Data model

**`users/{uid}`**: donors and any account with an explicit role

| Field | Type | Notes |
|---|---|---|
| `name`, `email` | string | |
| `phone` | string | Stored in `+92...` format |
| `bloodGroup` | string | One of A+, A-, B+, B-, AB+, AB-, O+, O- |
| `location` | map | `text`, `lat`, `lng` (coordinates are `null` for a typed area) |
| `isAvailable` | boolean | |
| `role` | string | `Donor` for self-registered users; `platformAdmin` for admins |
| `createdAt` | timestamp | |

**`organisations/{uid}`**: hospitals and blood banks (the document ID is the organization's login UID)

| Field | Type | Notes |
|---|---|---|
| `name`, `type` | string | `type` is `hospital` or `bloodbank` |
| `status` | string | `pending`, `approved` or `rejected` |
| `address`, `email`, `phone` | string | |
| `registrationNo`, `licenseNo` | string | |
| `contactPerson`, `accountHolderName` | string | |
| `documents` | array | List of `{ name, url }` (Cloudinary links) |
| `rejectionReason` | string or null | Set by the admin on rejection |
| `reviewedBy`, `reviewedAt` | string, timestamp | Set when an admin decides |
| `createdAt` | timestamp | |

Other collections: `phones` (duplicate phone check during donor registration) and `otp_codes` (verification-code demo, see [Known limitations](#known-limitations)).

## Firestore security rules

The rules are in [`firestore.rules`](firestore.rules). In short:

- Users can read their own profile. Admins can read all profiles.
- Self-registration is allowed only with the role `Donor`, so nobody can create their own admin or organization account.
- An organization can create its own record only with the status `pending`, and can read only its own record.
- **Only a platform admin can change an organization's status** (approve or reject).
- Operational collections (the `requests` rule is a template) are available only to **approved** organizations and admins, which enforces the rule that organizations must be approved before creating or fulfilling requests.

Deploy the rules with the Firebase CLI (`firebase deploy --only firestore:rules`) or paste them in Firebase Console > Firestore Database > Rules.

## Testing

- **Unit tests:** `npm test` runs the Vitest suites (for example the admin guard and admin utilities).
- **Manual test cases:** the full test cases for FR1, FR2.1 and FR3 are in `docs/BloodBridge_Master_Test_Cases.xlsx`, with steps, test data and expected results for each case.

## Known limitations

- The `phones` and `otp_codes` collections are open in the rules for now. The organization email code is generated and checked in the browser, so it is **not secure**. The planned fix is to send and verify codes in a Cloud Function.
- The screens switch from app state, not from URLs, so there are no direct routes such as `/admin`.
- A rejected organization sees that it was not approved, but not the admin's reason, and **Edit & Resubmit** is not built yet.
- Hospital staff accounts (FR4) are not built yet.
- The `requests` rule is a template. Rename it when the real request collection is added.

## Roadmap

Planned from the SRS:

- Hospital staff accounts (FR4) and organization profiles
- Donor profile management and alert preferences (SMS and email)
- Emergency blood requests with urgency levels
- Rule-based donor matching and ranking by blood group and distance, with a search radius that grows with urgency
- SMS and email notifications with retries, and live donor responses for hospital staff
- Blood bank stock search and hospital-to-blood-bank requests
- Google Maps for distance, map pins and directions
