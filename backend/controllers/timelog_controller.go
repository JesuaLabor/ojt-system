package controllers

import (
	"fmt"
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Input Structs ────────────────────────────────────────────────────────────

type CreateTimeLogInput struct {
	ClockIn       string `json:"clock_in"  binding:"required"` // ISO 8601: "2026-03-08T08:00:00Z"
	ClockOut      string `json:"clock_out"`                    // Optional — omit for clock-in only
	Remarks       string `json:"remarks"`
	ClockInPhoto  string `json:"clock_in_photo"`
	ClockOutPhoto string `json:"clock_out_photo"`
}

type RejectTimeLogInput struct {
	Remarks string `json:"remarks" binding:"required"`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// calcHours computes total hours between two times, rounded to 2 decimal places.
func calcHours(clockIn time.Time, clockOut time.Time) float64 {
	return math.Round(clockOut.Sub(clockIn).Hours()*100) / 100
}

// ─── POST /api/timelogs ───────────────────────────────────────────────────────
// Creates a new time log record. If clock_out is provided, total_hours is
// auto-calculated. If omitted, the log is saved as an ongoing clock-in.

func CreateTimeLog(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input CreateTimeLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Guard: Must have an assignment to log time
	var assignment models.OJTAssignment
	if result := config.DB.Where("student_id = ?", userID).First(&assignment); result.Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot log time until you have been assigned to a company by your coordinator."})
		return
	}

	// Parse clock_in
	clockIn, err := time.Parse(time.RFC3339, input.ClockIn)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid clock_in format. Use ISO 8601: 2026-03-08T08:00:00Z"})
		return
	}

	// Guard: no future clock-in
	if clockIn.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clock_in cannot be in the future"})
		return
	}

	// Guard: no duplicate open session
	var existing models.TimeLog
	if result := config.DB.Where("student_id = ? AND clock_out IS NULL", userID).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error":         "You already have an active clock-in session",
			"active_log_id": existing.ID,
		})
		return
	}

	entry := models.TimeLog{
		StudentID:     userID.(uint),
		ClockIn:       clockIn,
		Status:        "pending",
		Remarks:       input.Remarks,
		ClockInPhoto:  input.ClockInPhoto,
		ClockOutPhoto: input.ClockOutPhoto,
	}

	// If clock_out is provided, calculate total_hours immediately
	if input.ClockOut != "" {
		clockOut, err := time.Parse(time.RFC3339, input.ClockOut)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid clock_out format. Use ISO 8601: 2026-03-08T17:00:00Z"})
			return
		}
		if !clockOut.After(clockIn) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "clock_out must be after clock_in"})
			return
		}
		entry.ClockOut = &clockOut
		entry.TotalHours = calcHours(clockIn, clockOut)
	}

	if result := config.DB.Create(&entry); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create time log"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Time log created successfully",
		"log":     entry,
	})
}

// ─── POST /api/timelogs/clockin ───────────────────────────────────────────────
// Convenience: instantly clock in using current server time.

func ClockIn(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Guard: Must have an assignment to log time
	var assignment models.OJTAssignment
	if result := config.DB.Where("student_id = ?", userID).First(&assignment); result.Error != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot clock in until you have been assigned to a company by your coordinator."})
		return
	}

	// Guard: no duplicate open session
	var existing models.TimeLog
	if result := config.DB.Where("student_id = ? AND clock_out IS NULL", userID).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error":         "You are already clocked in",
			"active_log_id": existing.ID,
		})
		return
	}

	// Handle Photo Upload
	fileHeader, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo is required for clock-in"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read photo"})
		return
	}
	defer src.Close()

	// Upload to Cloudinary
	publicID := fmt.Sprintf("clockin_%v_%d", userID, time.Now().Unix())
	photoURL, err := config.UploadImage(src, publicID, "ojt-system/timelogs")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload photo: " + err.Error()})
		return
	}

	entry := models.TimeLog{
		StudentID:    userID.(uint),
		ClockIn:      time.Now(),
		Status:       "pending",
		ClockInPhoto: photoURL,
	}

	if result := config.DB.Create(&entry); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save time log"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Clocked in successfully with photo verification", "log": entry})
}

// ─── PATCH /api/timelogs/clockout ─────────────────────────────────────────────
// Convenience: clock out the currently active session using current server time.

func ClockOut(c *gin.Context) {
	userID, _ := c.Get("userID")

	var entry models.TimeLog
	if result := config.DB.Where("student_id = ? AND clock_out IS NULL", userID).First(&entry); result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active clock-in session found"})
		return
	}

	// Handle Photo Upload
	fileHeader, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo is required for clock-out"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read photo"})
		return
	}
	defer src.Close()

	// Upload to Cloudinary
	publicID := fmt.Sprintf("clockout_%v_%d", userID, time.Now().Unix())
	photoURL, err := config.UploadImage(src, publicID, "ojt-system/timelogs")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload photo: " + err.Error()})
		return
	}

	now := time.Now()
	entry.ClockOut = &now
	entry.ClockOutPhoto = photoURL
	entry.TotalHours = calcHours(entry.ClockIn, now)
	config.DB.Save(&entry)

	c.JSON(http.StatusOK, gin.H{
		"message":     "Clocked out successfully with photo verification",
		"total_hours": entry.TotalHours,
		"log":         entry,
	})
}

// ─── GET /api/timelogs ────────────────────────────────────────────────────────
// Student: view their own time logs (with optional ?status= filter).

func GetMyTimeLogs(c *gin.Context) {
	userID, _ := c.Get("userID")
	statusFilter := c.Query("status") // e.g. ?status=approved

	query := config.DB.Preload("Student").Where("student_id = ?", userID).Order("clock_in desc")
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}

	var logs []models.TimeLog
	query.Find(&logs)

	var assignment models.OJTAssignment
	result := config.DB.Where("student_id = ?", userID).First(&assignment)
	hasAssignment := result.Error == nil && assignment.ID != 0

	requiredHours := 600.0
	if hasAssignment && assignment.RequiredHours > 0 {
		requiredHours = assignment.RequiredHours
	}

	c.JSON(http.StatusOK, gin.H{
		"total":          len(logs),
		"logs":           logs,
		"required_hours": requiredHours,
		"has_assignment": hasAssignment,
	})
}

// ─── GET /api/timelogs/:student_id ────────────────────────────────────────────
// Supervisor / Coordinator / Faculty: view all logs for a specific student.
// Supports optional query filters: ?status=pending&date_from=2026-01-01&date_to=2026-03-31

func GetStudentTimeLogs(c *gin.Context) {
	studentID := c.Param("student_id")
	statusFilter := c.Query("status")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	// Verify student exists
	var student models.User
	if result := config.DB.First(&student, studentID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	query := config.DB.Where("student_id = ?", studentID).Order("clock_in desc")

	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}
	if dateFrom != "" {
		query = query.Where("clock_in >= ?", dateFrom)
	}
	if dateTo != "" {
		query = query.Where("clock_in <= ?", dateTo+" 23:59:59")
	}

	var logs []models.TimeLog
	query.Find(&logs)

	// Calculate totals
	var totalApproved, totalPending float64
	for _, l := range logs {
		if l.Status == "approved" {
			totalApproved += l.TotalHours
		} else if l.Status == "pending" {
			totalPending += l.TotalHours
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"student": gin.H{
			"id":    student.ID,
			"name":  student.Name,
			"email": student.Email,
		},
		"summary": gin.H{
			"total_logs":           len(logs),
			"total_approved_hours": math.Round(totalApproved*100) / 100,
			"total_pending_hours":  math.Round(totalPending*100) / 100,
		},
		"logs": logs,
	})
}

// ─── GET /api/timelogs/:student_id/summary ────────────────────────────────────
// Returns a compact progress summary for a student (hours vs. required).

func GetStudentSummary(c *gin.Context) {
	studentID := c.Param("student_id")

	var student models.User
	if result := config.DB.First(&student, studentID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Fetch OJT assignment for required hours
	var assignment models.OJTAssignment
	config.DB.Where("student_id = ?", studentID).First(&assignment)

	// Sum approved hours
	var logs []models.TimeLog
	config.DB.Where("student_id = ? AND status = 'approved'", studentID).Find(&logs)

	var approvedHours float64
	for _, l := range logs {
		approvedHours += l.TotalHours
	}
	approvedHours = math.Round(approvedHours*100) / 100

	requiredHours := 600.0
	if assignment.RequiredHours > 0 {
		requiredHours = assignment.RequiredHours
	}

	remaining := requiredHours - approvedHours
	if remaining < 0 {
		remaining = 0
	}

	progress := (approvedHours / requiredHours) * 100
	if progress > 100 {
		progress = 100
	}

	c.JSON(http.StatusOK, gin.H{
		"student_id":      student.ID,
		"student_name":    student.Name,
		"required_hours":  requiredHours,
		"completed_hours": approvedHours,
		"remaining_hours": math.Round(remaining*100) / 100,
		"progress_pct":    math.Round(progress*100) / 100,
		"is_completed":    approvedHours >= requiredHours,
	})
}

// ─── PATCH /api/timelogs/:id/approve ─────────────────────────────────────────
// Supervisor or Coordinator approves a pending time log.

func ApproveTimeLog(c *gin.Context) {
	id := c.Param("id")
	approverID, _ := c.Get("userID")

	var entry models.TimeLog
	if result := config.DB.First(&entry, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Time log not found"})
		return
	}

	if entry.Status == "approved" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Time log is already approved"})
		return
	}

	// Ensure the log has a clock_out before approving
	if entry.ClockOut == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot approve a log without a clock_out time"})
		return
	}

	uid := approverID.(uint)
	entry.Status = "approved"
	entry.ApprovedBy = &uid
	config.DB.Save(&entry)

	c.JSON(http.StatusOK, gin.H{
		"message": "Time log approved",
		"log":     entry,
	})
}

// ─── PATCH /api/timelogs/:id/reject ──────────────────────────────────────────
// Supervisor or Coordinator rejects a time log with a required reason.

func RejectTimeLog(c *gin.Context) {
	id := c.Param("id")

	var input RejectTimeLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "remarks field is required for rejection"})
		return
	}

	var entry models.TimeLog
	if result := config.DB.First(&entry, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Time log not found"})
		return
	}

	if entry.Status == "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Time log is already rejected"})
		return
	}

	entry.Status = "rejected"
	entry.Remarks = input.Remarks
	config.DB.Save(&entry)

	c.JSON(http.StatusOK, gin.H{
		"message": "Time log rejected",
		"log":     entry,
	})
}
