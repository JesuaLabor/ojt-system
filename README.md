# OJT Performance Monitoring and Time Tracking System

A full-stack web application to digitalize the OJT process.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Go + Gin Framework + GORM
- **Database**: MySQL
- **Auth**: JWT

## Project Structure
```
ojt-system/
├── backend/       # Go + Gin REST API
└── frontend/      # React + Vite SPA
```

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env   # fill in your DB credentials
go mod tidy
go run cmd/api/main.go
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev
```

## Roles
- **Student** — logs hours, views evaluations
- **Supervisor** — approves hours, submits evaluations
- **Coordinator** — monitors all students, generates reports
- **Faculty** — views student progress
