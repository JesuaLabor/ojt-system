#!/bin/bash

# Exit on error for initial steps
set -e

echo "Starting Database (pg-container)..."
docker start pg-container

# Turn off exit on error for lingering processes
set +e

echo "Starting Backend..."
cd backend
go run cmd/api/main.go &
BACKEND_PID=$!

echo "Starting Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "========================================"
echo "OJT System is starting up!"
echo "Backend running on PID: $BACKEND_PID"
echo "Frontend running on PID: $FRONTEND_PID"
echo "Press Ctrl+C to gracefully stop all services."
echo "========================================"

# Trap Ctrl+C (SIGINT) and kill the frontend and backend processes
trap "echo 'Stopping OJT System...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Services stopped.'; exit" SIGINT SIGTERM

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
