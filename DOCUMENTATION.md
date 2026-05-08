# OJT Performance Monitoring & Time Tracking System
### Full Project Documentation

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [System Architecture](#4-system-architecture)
5. [User Roles](#5-user-roles)
6. [Data Models](#6-data-models)
7. [Backend API Reference](#7-backend-api-reference)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Frontend Pages](#9-frontend-pages)
10. [Environment Configuration](#10-environment-configuration)
11. [Getting Started (Local Development)](#11-getting-started-local-development)
12. [Docker Deployment](#12-docker-deployment)
13. [Cloud Integrations](#13-cloud-integrations)
14. [Business Logic](#14-business-logic)

---

## 1. Project Overview

The **OJT Performance Monitoring and Time Tracking System** is a full-stack web application that digitalizes the On-the-Job Training process. It replaces manual paperwork with a centralized platform where:
- **Students** log hours and submit documents
- **Supervisors** approve time logs and submit performance evaluations
- **Coordinators** oversee all students, manage assignments, approve users/documents, and generate reports
- **Faculty** view student progress in a read-only capacity

**Key Features:**
- 🕐 Time log management (manual entry + live clock-in/out)
- ✅ Multi-level approval workflow
- 📊 5-criteria performance evaluations with grade labels
- 📄 Automated PDF report generation
- 📁 Document submission & approval (MOA, Endorsement, Waiver, Insurance)
- 🔔 In-app notification system
- 👤 Role-based user registration with coordinator-controlled approvals
- ☁️ Cloudinary integration for avatar uploads

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, React Router v6 |
| **State Management** | Zustand |
| **HTTP Client** | Axios |
| **Charts** | Recharts |
| **Excel Export** | xlsx |
| **Backend** | Go 1.21, Gin Framework |
| **ORM** | GORM |
| **Database** | PostgreSQL 14 |
| **Authentication** | JWT (HS256, 24hr expiry) |
| **Password Hashing** | bcrypt |
| **PDF Generation** | gofpdf |
| **Image Hosting** | Cloudinary |
| **Containerization** | Docker, Docker Compose |
| **Frontend Deploy** | Vercel |

---

## 3. Project Structure

```
ojt-system/
├── backend/
│   ├── cmd/api/main.go          # Entry point
│   ├── config/                  # DB + Cloudinary setup
│   ├── controllers/
│   │   ├── auth_controller.go
│   │   ├── timelog_controller.go
│   │   ├── evaluation_controller.go
│   │   ├── document_controller.go
│   │   ├── report_controller.go
│   │   ├── assignment_controller.go
│   │   ├── coordinator_controller.go
│   │   ├── supervisor_controller.go
│   │   ├── approval_controller.go
│   │   ├── company_controller.go
│   │   └── notification_controller.go
│   ├── middleware/              # AuthMiddleware + RoleMiddleware
│   ├── models/models.go         # All GORM structs
│   ├── routes/routes.go         # Route registration
│   ├── uploads/                 # Local document file storage
│   ├── Dockerfile
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root router + auth guards
│   │   ├── store/authStore.js   # Zustand auth state
│   │   ├── services/api.js      # Axios base instance
│   │   ├── components/layout/   # Shared layouts
│   │   ├── components/ui/       # Reusable UI widgets
│   │   └── pages/
│   │       ├── auth/            # Login, Register, PendingApproval
│   │       ├── student/         # 5 pages
│   │       ├── supervisor/      # 6 pages
│   │       ├── coordinator/     # 10 pages
│   │       └── faculty/         # 5 pages
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml
├── run.sh                       # Start all services locally
├── deploy.sh                    # Production deploy helper
└── test_api.sh                  # Shell-based API test suite
```

---

## 4. System Architecture

```
┌─────────────────────────────────────────────┐
│               Browser (React SPA)            │
│   Vite + React + Tailwind + Zustand + Axios  │
└────────────────────┬────────────────────────┘
                     │ HTTP/REST (JSON)
                     ▼
┌─────────────────────────────────────────────┐
│          Go Backend (Gin Framework)          │
│  JWT Auth → Role Check → GORM → PostgreSQL  │
└────────────┬──────────────┬─────────────────┘
             ▼              ▼
     ┌──────────────┐  ┌──────────────┐
     │  PostgreSQL  │  │  Cloudinary  │
     │  (Data)      │  │  (Images)    │
     └──────────────┘  └──────────────┘
```

---

## 5. User Roles

| Role | Default Status | Capabilities |
|------|---------------|-------------|
| **Student** | `pending` | Log hours, upload documents, view own evaluations & progress |
| **Supervisor** | `pending` | View/approve assigned student logs, submit evaluations, generate reports |
| **Coordinator** | `active` | Full admin: manage assignments, companies, users, documents; view everything; generate reports |
| **Faculty** | `active` | Read-only: view all students, evaluations, reports |

**Account lifecycle:** `pending` → coordinator approves → `active` | coordinator rejects → `rejected`

---

## 6. Data Models

### User
```
id | name | email (unique) | password (hashed) | role | status | profile_photo
```

### OJTAssignment
```
id | student_id → User | supervisor_id → User | coordinator_id → User
company_name | required_hours (default 600) | start_date | end_date | status
```

### TimeLog
```
id | student_id → User | clock_in | clock_out (nullable) | total_hours
status (pending/approved/rejected) | remarks | approved_by → User
```

### Evaluation
```
id | student_id → User | supervisor_id → User | period
technical_score | communication_score | punctuality_score
teamwork_score | initiative_score | overall_score (auto avg) | feedback
```

### Document
```
id | student_id → User | type (MOA/Endorsement/Waiver/Insurance)
file_url | status (pending/approved/rejected) | rejection_reason
```

### Company
```
id | name | address | contact_person | contact_email | contact_phone | status
```

### Notification
```
id | user_id → User | message | is_read (default false) | link
```

---

## 7. Backend API Reference

**Base URL:** `http://localhost:8080/api`

### Health
| Method | Endpoint | Auth | Notes |
|--------|---------|------|-------|
| GET | `/health` | None | Returns `{"status":"ok","version":"v1.1"}` |

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Notes |
|--------|---------|------|-------|
| POST | `/auth/register` | None | Returns JWT + user object |
| POST | `/auth/login` | None | Returns JWT + user object |
| POST | `/auth/change-password` | JWT | Requires `current_password`, `new_password` |

### Profile (`/api/me`)
| Method | Endpoint | Auth | Notes |
|--------|---------|------|-------|
| GET | `/me` | JWT | Get own profile |
| PUT | `/me` | JWT | Update `name` / `profile_photo` |
| POST | `/me/avatar` | JWT | Multipart upload → Cloudinary |

### Time Logs (`/api/timelogs`)
| Method | Endpoint | Role | Notes |
|--------|---------|------|-------|
| POST | `/timelogs` | All | Manual entry; `clock_in` required, `clock_out` optional |
| POST | `/timelogs/clockin` | All | Instant clock-in (server time) |
| PATCH | `/timelogs/clockout` | All | Clock out current active session |
| GET | `/timelogs` | Student | Own logs; `?status=` filter |
| GET | `/timelogs/:student_id` | Sup/Coord/Fac | Student's logs; `?status=&date_from=&date_to=` |
| GET | `/timelogs/:student_id/summary` | Sup/Coord/Fac | Hours progress object |
| PATCH | `/timelogs/:id/approve` | Supervisor/Coordinator | Approve log (must have clock_out) |
| PATCH | `/timelogs/:id/reject` | Supervisor/Coordinator | Reject log (requires `remarks`) |

### Evaluations (`/api/evaluations`)
| Method | Endpoint | Role | Notes |
|--------|---------|------|-------|
| POST | `/evaluations` | Supervisor | Create eval; overall auto-calculated |
| GET | `/evaluations/me` | Student | Own evaluations |
| GET | `/evaluations/:student_id` | Sup/Coord/Fac | All evals for student; `?period=` |
| GET | `/evaluations/:student_id/latest` | Sup/Coord/Fac | Most recent evaluation |

### Reports (`/api/reports`)
| Method | Endpoint | Role | Notes |
|--------|---------|------|-------|
| GET | `/reports/:student_id/pdf` | Sup/Coord/Fac | Streams PDF download |

### Documents (`/api/documents`)
| Method | Endpoint | Role | Notes |
|--------|---------|------|-------|
| POST | `/documents` | Student | Multipart: `file` + `document_type` |
| GET | `/documents` | Student | Own documents |

### Notifications (`/api/notifications`)
| Method | Endpoint | Notes |
|--------|---------|-------|
| GET | `/notifications` | Own notifications |
| PATCH | `/notifications/:id/read` | Mark one read |
| PATCH | `/notifications/read-all` | Mark all read |

### Supervisor (`/api/supervisor`) — Supervisor only
| Method | Endpoint | Notes |
|--------|---------|-------|
| GET | `/supervisor/students` | Assigned students with hours + progress |
| GET | `/supervisor/notifications` | Own notifications |
| PATCH | `/supervisor/notifications/read-all` | Mark all read |
| GET | `/supervisor/activity` | Recent student time log activity feed |

### Coordinator (`/api/coordinator`) — Coordinator only
| Method | Endpoint | Notes |
|--------|---------|-------|
| GET | `/coordinator/students` | All students with full stats |
| GET | `/coordinator/stats` | System-wide counts |
| GET | `/coordinator/users/pending` | Users by status (`?status=pending/active/rejected`) |
| PATCH | `/coordinator/users/:id/approve` | Activate user |
| PATCH | `/coordinator/users/:id/reject` | Reject user |
| GET | `/coordinator/documents` | All documents (`?status=`) |
| PATCH | `/coordinator/documents/:id/approve` | Approve document |
| PATCH | `/coordinator/documents/:id/reject` | Reject document (requires `reason`) |

### Faculty (`/api/faculty`) — Faculty only
| Method | Endpoint | Notes |
|--------|---------|-------|
| GET | `/faculty/students` | All students (same as coordinator view) |
| GET | `/faculty/stats` | System-wide stats |

### Assignments (`/api/assignments`) — Coordinator only
| Method | Endpoint | Notes |
|--------|---------|-------|
| GET | `/assignments` | All assignments |
| GET | `/assignments/options` | Available students, supervisors, companies for form |
| POST | `/assignments` | Create assignment |
| PATCH | `/assignments/:id` | Update assignment |
| DELETE | `/assignments/:id` | Soft delete |

### Companies (`/api/companies`) — Coordinator only
| Method | Endpoint | Notes |
|--------|---------|-------|
| GET | `/companies` | List companies |
| POST | `/companies` | Create company |
| PATCH | `/companies/:id` | Update company |
| DELETE | `/companies/:id` | Delete company |

---

## 8. Authentication & Authorization

- **Token format:** `Authorization: Bearer <JWT>`
- **Algorithm:** HS256
- **Expiry:** 24 hours
- **Claims:** `user_id`, `email`, `role`, `name`

**Middleware stack:**
```
Request → AuthMiddleware → [RoleMiddleware] → Controller
```

**Registration Logic:**
- `coordinator` and `faculty` → auto `active`
- `student` and `supervisor` → `pending` until coordinator approves
- Rejected accounts (`rejected`) are blocked at login with a friendly message

---

## 9. Frontend Pages

### Auth (`/`)
| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Email/password login |
| `/register` | RegisterPage | Role-select + sign up |
| `/waiting-room` | PendingApproval | Shown to pending users |

### Student (`/student/*`)
| Page | Description |
|------|-------------|
| Overview | Progress bar, assignment details, hours summary |
| TimeLogs | Clock in/out, manual entry, filter & view log history |
| Evaluations | View all received evaluation scores and feedback |
| Documents | Upload and track required OJT documents |
| Dashboard | Navigation hub |

### Supervisor (`/supervisor/*`)
| Page | Description |
|------|-------------|
| Overview | Own stats and quick links |
| Students | Assigned students with progress indicators |
| TimeLogs | Approve/reject pending student logs |
| Evaluations | Submit evaluations per student/period |
| Reports | Generate PDF reports |
| Dashboard | Stats and activity feed |

### Coordinator (`/coordinator/*`)
| Page | Description |
|------|-------------|
| Overview | All-students progress summary |
| Students | Full roster with status, hours, evaluation grade |
| Assignments | CRUD OJT assignments |
| Companies | Manage partner company list |
| Documents | Review and approve/reject all documents |
| Evaluations | View evaluations across all students |
| TimeLogs | Monitor all student time logs |
| Reports | Download per-student PDF reports |
| UserApprovals | Approve/reject pending user registrations |
| Dashboard | System-wide stats |

### Faculty (`/faculty/*`)
| Page | Description |
|------|-------------|
| Overview | Student progress overview |
| Students | Student roster (read-only) |
| Evaluations | View all evaluations |
| Reports | Download student reports |
| Dashboard | Summary stats |

### Route Protection (`PrivateRoute`)
1. No token → `/login`
2. Token exists, user pending → `/waiting-room`
3. Wrong role → `/login`
4. Valid → render children

---

## 10. Environment Configuration

### Backend `.env`
```env
PORT=8080
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=ojtsystem
DB_NAME=ojt_system
DB_PORT=5432
JWT_SECRET=your_strong_secret_here
FRONTEND_URL=http://localhost:5173
APP_BASE_URL=http://localhost:8080

# Cloudinary (https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:8080/api
```

---

## 11. Getting Started (Local Development)

### Prerequisites
- Go 1.21+, Node.js 20+, PostgreSQL 14+

### Quick Start (all-in-one)
```bash
# Start pg-container (Docker) + backend + frontend
./run.sh
```

### Manual Setup

**Database:**
```bash
docker run -d --name pg-container \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=ojtsystem \
  -e POSTGRES_DB=ojt_system \
  -p 5432:5432 postgres:14-alpine
```

**Backend:**
```bash
cd backend
cp .env.example .env   # fill credentials
go mod tidy
go run cmd/api/main.go  # → http://localhost:8080
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev             # → http://localhost:5173
```

> GORM auto-migrates all tables on startup — no manual SQL needed.

---

## 12. Docker Deployment

```bash
docker compose up --build
```

| Service | Port | Image |
|---------|------|-------|
| `db` | 5432 | postgres:14-alpine |
| `backend` | 8080 | Built from `./backend` |
| `frontend` | 5173 | node:20-alpine (dev server) |

Data persists in the `postgres_data` named volume.

---

## 13. Cloud Integrations

### Cloudinary
- Used for **profile photo / avatar** uploads
- Folder: `ojt-system/avatars/`
- Public ID format: `avatar_{userID}_{unixTimestamp}`
- URL stored in `users.profile_photo`

### Local File Storage (Documents)
- Stored in `backend/uploads/`
- Filename format: `{studentID}_{docType}_{timestamp}.{ext}`
- Re-uploading the same document type **replaces** the existing DB record

---

## 14. Business Logic

### Time Log Rules
- `clock_in` must not be in the future
- Only one active session (open `clock_out`) per student at a time
- `clock_out` must be after `clock_in`
- Cannot approve a log without a `clock_out`
- `total_hours = round((clockOut - clockIn).hours, 2)`

### OJT Hours Progress
- Default required hours: **600**
- `OJTAssignment.required_hours` overrides default if set
- `progress_pct = (approved_hours / required_hours) × 100`, capped at 100%
- Status thresholds:

| Status | Condition |
|--------|-----------|
| `Completed` | approved_hours ≥ required_hours |
| `On Track` | progress_pct ≥ 30% |
| `Behind` | progress_pct < 30% |

### Evaluation Scoring
- **5 criteria** scored 0–100: Technical, Communication, Punctuality, Teamwork, Initiative
- `overall_score = avg(all 5)` rounded to 2 decimal places
- One evaluation per student + supervisor + period (duplicates blocked)

| Score | Grade Label |
|-------|------------|
| ≥ 90 | Outstanding |
| ≥ 80 | Very Satisfactory |
| ≥ 70 | Satisfactory |
| ≥ 60 | Fairly Satisfactory |
| < 60 | Needs Improvement |

### PDF Report Sections
1. **Student Information** — name, email, ID
2. **OJT Assignment Details** — company, dates, supervisor, coordinator
3. **Hours Summary** — required / approved / remaining with visual progress bar
4. **Weekly Hours Breakdown** — table sorted chronologically by ISO week
5. **Performance Evaluations** — all periods, all criteria, color-coded by grade
6. **Supervisor Feedback** — one section per evaluation period

### Notification Triggers
| Event | Recipient | Message |
|-------|----------|---------|
| Document approved | Student | `"Your {type} document has been approved."` |
| Document rejected | Student | `"Your {type} document was rejected. Reason: {reason}"` |

---

*Documentation generated: May 2026*
