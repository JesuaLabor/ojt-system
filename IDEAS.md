# OJT System Roadmap & Enhancements

Based on the current state of the system, which already features a premium UI, robust biometric verification, and advanced filtering, here are several high-impact features and improvements to take the platform to the next level.

## 1. Attendance & Accountability
### 🚨 Absence & Inactivity Monitoring (New!)
*   **Feature:** Automatically flag students who haven't logged time in a specified period (e.g., 3+ days).
*   **Implementation:** 
    *   Backend: Calculate `days_since_last_log` in the student list API.
    *   Frontend: Add "Risk Levels" (Normal, Warning, Danger) with color-coded badges and a "Students at Risk" dashboard card.
*   **Value:** Proactively identifies potential dropouts or issues at the workplace before they become major problems.

### 📍 Geofencing for Time Logs
*   **Feature:** Verify that students are physically at the company location when they clock in/out.
*   **Implementation:** 
    *   Use the browser's Geolocation API to capture coordinates.
    *   Compare coordinates with the Company's stored location (with a configurable radius, e.g., 200m).
*   **Value:** Prevents "remote" clock-ins from unauthorized locations.

## 2. Automation & Reporting
### 📜 Automated Daily Time Record (DTR) PDF (Implemented! ✅)
*   **Feature:** One-click generation of a professional DTR/Timesheet ready for printing.
*   **Implementation:** 
    *   Added a "Download DTR" button in the Time Logs page that uses `jspdf` and `jspdf-autotable` to compile approved logs into a standard PDF template with signature lines.
*   **Value:** Saves students hours of manual formatting and ensures data accuracy for school requirements.

### 📜 Automated Certificate Generation
*   **Feature:** Auto-generate a professional PDF "Certificate of Completion" once the student hits 100% progress.
*   **Implementation:** 
    *   Backend logic to verify all requirements (Hours + Documents + Evaluations).
    *   PDF generation using a library like `gofpdf` (Go) or a frontend library like `jsPDF`.
*   **Value:** Instant gratification for students and less manual work for coordinators.

## 3. Communication & Engagement
### 📢 Announcement System
*   **Feature:** A dedicated space for Coordinators and Supervisors to post announcements (e.g., deadlines, holiday schedules, seminar invites).
*   **Value:** Keeps students informed without relying on external messaging apps.

### 💬 Direct Messaging (Lightweight)
*   **Feature:** Simple chat or inquiry system between Students and their assigned Supervisor/Coordinator.
*   **Value:** Streamlines communication for quick questions regarding logs or tasks.

## 4. Compliance & Qualitative Data
### 📂 Weekly Accomplishment Journals
*   **Feature:** A structured journal where students summarize their tasks and learnings for the week.
*   **Implementation:** 
    *   A new `Journals` section where students submit weekly entries for supervisor acknowledgement.
*   **Value:** Provides qualitative data on student progress beyond just hours rendered.

## 5. UI/UX & Platform
### 📱 Progressive Web App (PWA) Support
*   **Feature:** Allow students to "Install" the app on their phone for easier access to the camera for clocking in.
*   **Value:** Provides a native-app feel and easier access for daily clock-ins.

---

### Suggested Next Step
Which of these features would you like to prioritize first? I recommend starting with the **Absence Monitoring** or **Automated DTR** as they solve the most common "headaches" for both students and coordinators.
