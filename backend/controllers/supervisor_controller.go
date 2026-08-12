package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// ─── GET /api/supervisor/students ─────────────────────────────────────────────
// Returns all students assigned to the logged-in supervisor, with hours summary.

func GetSupervisorStudents(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Fetch all OJT assignments for this supervisor
	var assignments []models.OJTAssignment
	config.DB.Preload("Student").Where("supervisor_id = ?", userID).Find(&assignments)

	type StudentSummary struct {
		StudentID       uint    `json:"student_id"`
		StudentName     string  `json:"student_name"`
		StudentEmail    string  `json:"student_email"`
		ProfilePhoto    string  `json:"profile_photo"`
		CompanyName     string  `json:"company_name"`
		RequiredHours   float64 `json:"required_hours"`
		CompletedHours  float64 `json:"completed_hours"`
		PendingHours    float64 `json:"pending_hours"`
		ProgressPct     float64 `json:"progress_pct"`
		Status          string  `json:"status"` // On Track, Behind, Completed
		PendingLogs     int64   `json:"pending_logs"`
		StartDate       string  `json:"start_date"`
		EndDate         string  `json:"end_date"`
		HasCertificate  bool    `json:"has_certificate"`
		CertificateURL  string  `json:"certificate_url"`
		HasEvaluation   bool    `json:"has_evaluation"`
		EvaluationScore float64 `json:"evaluation_score"`
	}

	var students []StudentSummary

	for _, a := range assignments {
		// Check certificate
		var cert models.Certificate
		hasCert := config.DB.Where("student_id = ?", a.StudentID).First(&cert).Error == nil
		certURL := ""
		if hasCert {
			certURL = cert.FileURL
		}

		// Check evaluation
		var eval models.Evaluation
		hasEval := config.DB.Where("student_id = ?", a.StudentID).First(&eval).Error == nil
		evalScore := 0.0
		if hasEval {
			evalScore = math.Round(eval.OverallScore*100) / 100
		}

		// Sum approved hours
		var approvedLogs []models.TimeLog
		config.DB.Where("student_id = ? AND status = 'approved'", a.StudentID).Find(&approvedLogs)
		var approvedHours float64
		for _, l := range approvedLogs {
			approvedHours += l.TotalHours
		}
		approvedHours = math.Round(approvedHours*100) / 100

		// Sum pending hours
		var pendingLogs []models.TimeLog
		config.DB.Where("student_id = ? AND status = 'pending'", a.StudentID).Find(&pendingLogs)
		var pendingHours float64
		for _, l := range pendingLogs {
			pendingHours += l.TotalHours
		}
		pendingHours = math.Round(pendingHours*100) / 100

		// Count pending log entries
		var pendingCount int64
		config.DB.Model(&models.TimeLog{}).Where("student_id = ? AND status = 'pending'", a.StudentID).Count(&pendingCount)

		requiredHours := 600.0
		if a.RequiredHours > 0 {
			requiredHours = a.RequiredHours
		}

		progress := (approvedHours / requiredHours) * 100
		if progress > 100 {
			progress = 100
		}
		progress = math.Round(progress*100) / 100

		// Determine status
		status := "On Track"
		if approvedHours >= requiredHours {
			status = "Completed"
		} else if progress < 30 {
			status = "Behind"
		}

		startDate := ""
		endDate := ""
		if !a.StartDate.IsZero() {
			startDate = a.StartDate.Format("2006-01-02")
		}
		if !a.EndDate.IsZero() {
			endDate = a.EndDate.Format("2006-01-02")
		}

		students = append(students, StudentSummary{
			StudentID:       a.StudentID,
			StudentName:     a.Student.Name,
			StudentEmail:    a.Student.Email,
			ProfilePhoto:    a.Student.ProfilePhoto,
			CompanyName:     a.CompanyName,
			RequiredHours:   requiredHours,
			CompletedHours:  approvedHours,
			PendingHours:    pendingHours,
			ProgressPct:     progress,
			Status:          status,
			PendingLogs:     pendingCount,
			StartDate:       startDate,
			EndDate:         endDate,
			HasCertificate:  hasCert,
			CertificateURL:  certURL,
			HasEvaluation:   hasEval,
			EvaluationScore: evalScore,
		})
	}

	// Calculate totals
	var totalPendingApprovals int64
	for _, s := range students {
		totalPendingApprovals += s.PendingLogs
	}

	c.JSON(http.StatusOK, gin.H{
		"total_students":          len(students),
		"total_pending_approvals": totalPendingApprovals,
		"students":                students,
	})
}

// ─── GET /api/supervisor/notifications ────────────────────────────────────────
// Returns recent notifications for the logged-in supervisor.

func GetSupervisorNotifications(c *gin.Context) {
	userID, _ := c.Get("userID")

	var notifications []models.Notification
	config.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(20).Find(&notifications)

	// Count unread
	var unreadCount int64
	config.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = false", userID).Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"total":         len(notifications),
		"unread_count":  unreadCount,
		"notifications": notifications,
	})
}

// ─── PATCH /api/supervisor/notifications/read-all ─────────────────────────────
// Marks all notifications as read.

func MarkAllNotificationsRead(c *gin.Context) {
	userID, _ := c.Get("userID")

	config.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = false", userID).Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

// ─── GET /api/supervisor/activity ─────────────────────────────────────────────
// Returns recent student activity for the supervisor's assigned students.

func GetSupervisorActivity(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Get student IDs assigned to this supervisor
	var assignments []models.OJTAssignment
	config.DB.Where("supervisor_id = ?", userID).Find(&assignments)

	studentIDs := make([]uint, 0)
	for _, a := range assignments {
		studentIDs = append(studentIDs, a.StudentID)
	}

	if len(studentIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"total":      0,
			"activities": []interface{}{},
		})
		return
	}

	// Recent time logs from assigned students
	var recentLogs []models.TimeLog
	config.DB.Preload("Student").Where("student_id IN ?", studentIDs).Order("created_at desc").Limit(10).Find(&recentLogs)

	type Activity struct {
		Type        string `json:"type"` // clock_in, clock_out, log_submitted
		StudentID   uint   `json:"student_id"`
		StudentName string `json:"student_name"`
		Message     string `json:"message"`
		Timestamp   string `json:"timestamp"`
		Status      string `json:"status"`
	}

	var activities []Activity
	for _, log := range recentLogs {
		msg := log.Student.Name + " submitted a time log"
		if log.ClockOut == nil {
			msg = log.Student.Name + " clocked in"
		}

		activities = append(activities, Activity{
			Type:        "time_log",
			StudentID:   log.StudentID,
			StudentName: log.Student.Name,
			Message:     msg,
			Timestamp:   log.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			Status:      log.Status,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total":      len(activities),
		"activities": activities,
	})
}
