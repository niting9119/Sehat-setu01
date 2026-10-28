# 🏥 Sehat Setu — Smart Community Health Monitoring & Early Warning System

Welcome to **Sehat Setu**! This guide is written to help you easily navigate the project, understand how every piece connects, and make your own modifications with ease.

---

## ⚡ 1-Minute Quick Start

### Option A: Using the Launcher Script (Easiest)
Simply double-click:
```bat
run.bat
```
*(This starts both the web application server and the C++ terminal engine.)*

### Option B: Using Terminal / Command Prompt
```bash
# 1. Install dependencies (only required once)
npm install

# 2. Start the web application
npm start
```
Now open your web browser at: **[http://127.0.0.1:3000](http://127.0.0.1:3000)**

---

## 🔑 Demo Login Accounts

| Role | Email | Password | What You Can Access |
| :--- | :--- | :--- | :--- |
| **👤 Citizen** | `rahul.sharma@example.com` | `password123` | Self-report symptoms with photo uploads, view family health signals, check prescriptions, lab tests, and doctor consultations. |
| **🩺 Doctor** | `dr.arishta@health.gov.in` | `password123` | Patient review queue, register new patients, 8-tab comprehensive patient history, clinical consultations, issue prescriptions. |
| **👩‍⚕️ ASHA Worker** | `sunita.asha@health.gov.in` | `password123` | Mobile-friendly field interface, assigned citizens, household cluster follow-ups, and field verification. |
| **🏛️ Admin / Authority** | `director.idsp@nic.in` | `password123` | Epidemiological surveillance command center, real Google Maps outbreak clusters, AI syndromic early warnings, and referrals. |

*(Note: Admin signup requires secret invitation code: `ADMIN2026`)*

---

## 📂 Project Structure & File Guide

Here is where every file is located and what it does:

```
hackthon/
├── run.bat                          <-- 🚀 One-click launcher from root
├── package.json                     <-- Root NPM scripts and dependencies
├── README.md                        <-- 📖 Master Developer Guide (This file)
│
└── hackfest/                        <-- 💻 Main Project Source Directory
    ├── package.json                 <-- Project metadata & start script
    ├── run.bat                      <-- Standalone launcher inside hackfest/
    ├── compile.bat                  <-- C++ compilation script (g++ / MinGW)
    ├── .env                         <-- Environment config (Port, Supabase keys)
    ├── .env.example                 <-- Example configuration template
    │
    ├── server.js                    <-- 🌐 Core Node.js Web Server & REST APIs
    ├── supabase_schema.sql          <-- 🗄️ PostgreSQL database tables & indexes
    ├── users.json                   <-- 💾 Local fallback database for users
    ├── sessions.json                <-- 💾 Local fallback database for active sessions
    │
    ├── index.html                   <-- 🖥️ Main Single Page Application (SPA) shell
    ├── login.html                   <-- 🔐 Role-based login page (Password + OTP)
    ├── signup.html                  <-- 📝 New account registration page
    │
    ├── db/
    │   └── supabase.js              <-- ⚡ Supabase Cloud Database adapter & fallback
    │
    ├── js/                          <-- ⚙️ Frontend Logic Modules
    │   ├── state.js                 <-- 🧠 Central Reactive State Store & mock data
    │   ├── router.js                <-- 🧭 Hash URL Router & portal permissions
    │   ├── app.js                   <-- 🎨 Main UI View Renderers (Citizen, Doctor, ASHA, Admin)
    │   ├── locations.js             <-- 📍 Indian Location Manager (State/District/Block)
    │   ├── map.js                   <-- 🗺️ Real Google Maps & Outbreak cluster overlay
    │   ├── charts.js                <-- 📊 SVG Risk Ring & HTML5 Canvas Trend charts
    │   ├── ui.js                    <-- 🔔 Toasts, Popups & Modal dialogs
    │   └── demo-flow.js             <-- 🎬 20-Step guided hackathon presenter bar
    │
    ├── css/                         <-- 🎨 Styling & Design System
    │   ├── variables.css            <-- 🎨 Colors, theme variables, fonts, shadows
    │   ├── base.css                 <-- 📐 Reset, typography, grid, buttons, inputs
    │   ├── components.css           <-- 🧩 Modals, cards, badges, tables, stepper
    │   └── views.css                <-- 🖼️ Layouts for Citizen, Doctor, ASHA, Admin
    │
    ├── data/
    │   └── india_locations.json     <-- 🗺️ Real Census/LGD administrative hierarchy
    │
    ├── cpp/                         <-- ⚙️ Standalone C++ Engine
    │   ├── sehat_setu.cpp           <-- C++17 ANSI terminal surveillance core
    │   └── sehat_setu.exe           <-- Compiled C++ executable
    │
    └── uploads/                     <-- 📁 Stored photos & lab report attachments
```

---

## 🛠️ How to Make Changes Yourself

### 1. How to Change Colors & Appearance
- Open [`hackfest/css/variables.css`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/css/variables.css).
- At the top of `:root`, you will find:
  - `--primary-600`: Change the primary teal brand color.
  - `--role-citizen`: Emerald green for Citizen Portal.
  - `--role-doctor`: Royal blue for Doctor Portal.
  - `--role-asha`: Purple for ASHA Portal.
  - `--role-admin`: Crimson red for Admin Command Center.
  - `--bg-app`: Background color of the whole application.

### 2. How to Edit or Add Patient / Mock Data
- Open [`hackfest/js/state.js`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/js/state.js).
- Refer to the **Table of Contents** at line 1:
  - `userAccounts`: Add or edit credentials for testing logins.
  - `doctorPatients`: Add new patient profiles to the doctor queue.
  - `zones`: Adjust risk scores, reported case counts, and alerts for Zone A through E.
  - `medicalRecords`: Add sample blood tests, widal tests, or lab attachments.

### 3. How to Modify UI Screens & Tabs
- Open [`hackfest/js/app.js`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/js/app.js).
- Refer to the **Quick Navigation Index** in lines 1-35:
  - To edit Citizen screens: search for `renderCitizenTabContent`.
  - To edit Doctor screens: search for `renderDoctorSubViewContent`.
  - To edit ASHA screens: search for `renderAshaSubViewContent`.
  - To edit Admin screens: search for `renderAdminView`.

### 4. How to Add a New URL Route
- Open [`hackfest/js/router.js`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/js/router.js).
- In `matchRoute(path)`:
  ```javascript
  if (normalized === '/citizen/my-feature') {
    return { role: 'citizen', tab: 'my_feature', params: {} };
  }
  ```
- Then open [`hackfest/js/app.js`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/js/app.js) and render HTML for `tab === 'my_feature'`.

### 5. How to Connect Cloud Supabase PostgreSQL
1. Create a free project at [supabase.com](https://supabase.com).
2. Open SQL Editor in Supabase and run [`hackfest/supabase_schema.sql`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/supabase_schema.sql).
3. Open [`hackfest/.env`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/.env) and fill in:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-or-service-role-key
   ```
4. Restart the server (`npm start`). It will automatically sync users and data!

### 6. How to Recompile the C++ Terminal Engine
If you make changes to [`hackfest/cpp/sehat_setu.cpp`](file:///c:/Users/nitin/OneDrive/Desktop/hackthon/hackfest/cpp/sehat_setu.cpp):
- Run `hackfest\compile.bat` (requires GCC / MinGW `g++`).
- Or run in terminal:
  ```bash
  g++ -std=c++17 -O2 hackfest/cpp/sehat_setu.cpp -o hackfest/sehat_setu.exe
  ```

---

## 💡 Troubleshooting & Tips

- **Resetting Test Data**: If you want to reset all state in your browser, open Developer Tools (F12) $\to$ Console $\to$ type `window.SehatState.resetState()` and refresh.
- **Port Busy?**: If port 3000 is used by another application, `server.js` automatically switches to port 3001, or you can specify `PORT=8080` in `hackfest/.env`.
- **Uploads**: Attached test photos and lab records are saved in `hackfest/uploads/`.
