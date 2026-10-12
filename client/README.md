# HealthEase — Frontend Single-Page Application (SPA)

The HealthEase frontend is a modern, responsive single-page application built on **React 19**, **React Router DOM v7**, **Ant Design (antd)**, and **Axios**, designed for seamless healthcare navigation across patients, medical practitioners, and system administrators.

---

## 1. Directory Structure

```text
client/
├── package.json                # Dependencies, proxy configuration, build scripts
├── package-lock.json           # Deterministic dependency lockfile
├── public/                     # Static HTML entry point & favicon
│   ├── favicon.ico
│   ├── index.html              # HTML5 entry with Bootstrap & FontAwesome CDN
│   ├── manifest.json
│   └── robots.txt
└── src/
    ├── api.js                  # Centralized Axios instance with JWT Authorization interceptor
    ├── App.js                  # Application routing table & route guards
    ├── App.test.js             # Automated unit tests with React Testing Library
    ├── index.js                # React DOM mount point wrapping App in AuthProvider
    ├── index.css               # Global theme tokens, glassmorphism, and styling
    ├── components/             # Reusable UI components
    │   ├── DoctorList.js       # Doctor profile card with formatted timings and direct booking
    │   ├── Layout.js           # Responsive dashboard layout with sidebar and notification badge
    │   ├── ProtectedRoute.js   # Route guard redirecting unauthenticated users to /login
    │   ├── PublicRoute.js      # Route guard redirecting authenticated users to /dashboard
    │   └── Spinner.js          # Loading state animation spinner
    ├── context/
    │   └── AuthContext.js      # React Context managing session token and user state
    ├── Data/
    │   └── data.js             # Role-specific sidebar navigation menus (User, Doctor, Admin)
    ├── pages/                  # Page-level components
    │   ├── LandingPage.js      # Public landing portal with portal-specific login options
    │   ├── Login.js            # User authentication view
    │   ├── Register.js         # Patient account registration view
    │   ├── HomePage.js         # Role-adaptive dashboard (Admin stats, Doctor agenda, Patient directory)
    │   ├── ApplyDoctor.js      # Doctor verification application form
    │   ├── BookingPage.js      # Slot selection, availability validation, and Google Maps locator
    │   ├── Appointments.js     # Patient appointment management table with slot cancellation
    │   ├── HospitalPage.js     # Regional hospital catalog with service tags and location modals
    │   ├── NotificationPage.js # Tabbed notification center (unread and read management)
    │   ├── UserProfile.js      # Patient profile modification form
    │   ├── Chatbot.js          # Dr. AI interface with speech recognition and speech synthesis
    │   ├── admin/              # Administrator-only views
    │   │   ├── Doctors.js      # Doctor credential review table with approve/reject actions
    │   │   └── Users.js        # User account management table with blocking controls
    │   └── doctor/             # Doctor-only views
    │       ├── DoctorAppointments.js # Doctor agenda table with appointment status controls
    │       └── Profile.js      # Doctor practice details and clinic hours management
    └── styles/
        ├── LayoutStyles.css    # Sidebar, topbar, and layout responsive styles
        └── RegisterStyles.css  # Authentication forms styling
```

---

## 2. Core Frontend Features & Implementations

### 2.1 Declarative Route Protection (`src/App.js`)
- **Public Routes:** Wrapped in `<PublicRoute>`. If an authenticated session is detected in `localStorage`, the user is immediately redirected to `/dashboard` to avoid duplicate logins:
  - `/` (Landing Page)
  - `/login` (Sign In)
  - `/register` (Sign Up)
- **Protected Routes:** Wrapped in `<ProtectedRoute>`. Verifies active JWT token; unauthenticated requests are redirected to `/login`:
  - `/dashboard` (Role-Adaptive Dashboard)
  - `/appointments` (Patient Appointments)
  - `/doctor/book-appointment/:doctorId` (Appointment Booking Portal)
  - `/apply-doctor` (Doctor Application Form)
  - `/hospitals` (Hospitals & Emergency Directory)
  - `/notification` (Notification Center)
  - `/profile` (Patient Profile)
  - `/chatbot` (Dr. AI Medical Assistant)
  - `/admin/doctors` & `/admin/users` (Admin Governance)
  - `/doctor-appointments` & `/doctor/profile/:id` (Doctor Clinical Views)

### 2.2 Global Authentication Context (`src/context/AuthContext.js`)
- Provides `user`, `setUser`, `loading`, `login(token, userData)`, `logout()`, and `refreshUser()`.
- On application mount, reads `token` from `localStorage` and calls `/api/v1/user/getUserData` to hydrate user roles (`isAdmin`, `isDoctor`, `role`).
- If token validation fails, automatically clears `localStorage` and resets user state to `null`.

### 2.3 Centralized Axios Client (`src/api.js`)
- **Request Interceptor:** Automatically injects `Authorization: Bearer <token>` into every HTTP request if a token exists in `localStorage`.
- **Response Interceptor:** Intercepts HTTP 401 Unauthorized responses globally and purges the invalid token from `localStorage`.

### 2.4 Role-Adaptive Home Dashboard (`src/pages/HomePage.js`)
The home dashboard dynamically renders tailored interfaces depending on the authenticated role:
1. **Patient View:**
   - Specialists directory querying `/api/v1/user/getAllDoctors` (cached in Redis).
   - "Book Clinic Visit" triggers navigation to `/doctor/book-appointment/:doctorId`.
   - "Video Consult" opens a modal collecting patient contact details and requests an online telehealth consultation.
2. **Doctor View:**
   - Practice overview cards: Active Appointments, Total Bookings, Cancelled Slots, and Verified Active badge.
   - Quick action shortcuts to Manage Appointments and Update Clinic Timings.
3. **Administrator View:**
   - Real-time system gauges: Total Registered Users, Verified Doctors, Pending Applications, Total Appointments, and Registered Hospitals.
   - Quick administrative navigation to review doctors and manage users.

### 2.5 Appointment Booking & Embedded Google Maps (`src/pages/BookingPage.js`)
- Displays doctor profile, consultation fee, and registered clinic hours.
- Integrated date picker (`DD-MM-YYYY`) and time picker (`HH:mm`).
- "Check Availability" validates slot availability in real time via `/api/v1/user/booking-availbility`.
- "Confirm Booking Immediately" completes atomic reservation via `/api/v1/user/book-appointment`.
- **Embedded Clinic Locator:** An embedded Google Maps iframe renders the doctor's exact clinic location side-by-side using `https://maps.google.com/maps?q=${encodeURIComponent(doctor.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`.

### 2.6 Medical AI Assistant "Dr. AI" (`src/pages/Chatbot.js`)
- Conversational symptom triage powered by Google Gemini via `/api/v1/chatbot/chat`.
- **Speech-to-Text (STT):** Integrates browser native `webkitSpeechRecognition` with continuous listening and a 1000ms silence debounce timer that automatically dispatches speech when the user pauses.
- **Text-to-Speech (TTS):** Converts Dr. AI's advice to audio using `SpeechSynthesisUtterance`. Cleans punctuation with regex and prioritizes natural female voices (`Aria`, `Samantha`, `Google UK English Female`, `Microsoft Zira`, `Jenny`).
- Maintains a sliding conversational context window of the last 10 messages.

### 2.7 Regional Healthcare Centers Directory (`src/pages/HospitalPage.js`)
- Directory of partner hospitals and emergency rooms with service tags (Cardiology, ICU, Pediatrics, Emergency 24/7).
- "View on Map" triggers an Ant Design modal with an embedded Google Maps view.
- Verified doctors and administrators have access to an "Add Hospital" modal to register new facilities.

### 2.8 In-App Notification Center (`src/pages/NotificationPage.js`)
- The top navigation bar displays an Ant Design `Badge` count of unread notifications.
- Two tabs: "Unread" and "Read".
- Action triggers: "Mark All Read" moves unread items to seen status; "Delete All Read" clears seen notifications.

---

## 3. Local Setup & Execution

### 1. Install Dependencies
```bash
cd client
npm install
```

### 2. Configure Environment (Optional)
Create `.env` in `client/` if connecting to an external backend:
```env
REACT_APP_API_URL=http://localhost:8000
```
*(By default, `package.json` includes `"proxy": "http://localhost:8000"`, automatically proxying API calls to the local FastAPI backend).*

### 3. Start Development Server
```bash
npm start
```
The application opens automatically at `http://localhost:3000`.

### 4. Run Unit Tests
```bash
npm test -- --watchAll=false
```

### 5. Build Production Bundle
```bash
npm run build
```
Generates optimized static assets in `client/build/` ready for deployment on Vercel, Netlify, or static hosting.
