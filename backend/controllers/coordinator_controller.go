package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// ─── GET /api/coordinator/students ─────────────────────────────────────────────
// Returns all students with their OJT assignments, hours progress, and latest evaluation.

func GetCoordinatorStudents(c *gin.Context) {
	// Optional filtering could happen here, but we will send all students and let frontend filter
	var assignments []models.OJTAssignment
	config.DB.Preload("Student").Preload("Supervisor").Find(&assignments)

	type StudentDetail struct {
		StudentID      uint    `json:"student_id"`
		StudentName    string  `json:"student_name"`
		StudentEmail   string  `json:"student_email"`
		ProfilePhoto   string  `json:"profile_photo"`
		CompanyName    string  `json:"company_name"`
		SupervisorName string  `json:"supervisor_name"`
		RequiredHours  float64 `json:"required_hours"`
		CompletedHours float64 `json:"completed_hours"`
		PendingHours   float64 `json:"pending_hours"`
		ProgressPct    float64 `json:"progress_pct"`
		Status         string  `json:"status"` // On Track, Behind, Completed
		LatestScore    float64 `json:"latest_score"`
		LatestGrade    string  `json:"latest_grade"`
		PendingLogs    int64   `json:"pending_logs"`
	}

	var students []StudentDetail
	var totalStudents, completedOJT, behindSchedule, pendingEvaluations int

	// Let's get all students who have role='student' just in case some don't have assignments yet?
	// The prompt implies students with assignments since they have Company, Progress, etc.
	for _, a := range assignments {
		totalStudents++

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
			completedOJT++
		} else if progress < 30 {
			status = "Behind"
			behindSchedule++
		}

		// Get latest evaluation score
		var eval models.Evaluation
		var latestScore float64
		var latestGrade string
		if result := config.DB.Where("student_id = ?", a.StudentID).Order("created_at desc").First(&eval); result.Error == nil {
			latestScore = eval.OverallScore
			latestGrade = gradeLabel(latestScore)
		} else {
			// No evaluation yet, assume pending evaluation needed if progress > 50%
			if progress >= 50 {
				pendingEvaluations++
			}
		}

		students = append(students, StudentDetail{
			StudentID:      a.StudentID,
			StudentName:    a.Student.Name,
			StudentEmail:   a.Student.Email,
			ProfilePhoto:   a.Student.ProfilePhoto,
			CompanyName:    a.CompanyName,
			SupervisorName: a.Supervisor.Name,
			RequiredHours:  requiredHours,
			CompletedHours: approvedHours,
			PendingHours:   pendingHours,
			ProgressPct:    progress,
			Status:         status,
			LatestScore:    latestScore,
			LatestGrade:    latestGrade,
			PendingLogs:    pendingCount,
		})
	}

	//test

	c.JSON(http.StatusOK, gin.H{
		"summary": gin.H{
			"total_students":      totalStudents,
			"completed_ojt":       completedOJT,
			"behind_schedule":     behindSchedule,
			"pending_evaluations": pendingEvaluations,
		},
		"students": students,
	})
}

// ─── GET /api/coordinator/stats ────────────────────────────────────────────────
// Coordinator dashboard summary stats (if requested separately).

func GetCoordinatorStats(c *gin.Context) {
	var totalStudents int64
	config.DB.Model(&models.User{}).Where("role = 'student'").Count(&totalStudents)

	var activeAssignments int64
	config.DB.Model(&models.OJTAssignment{}).Count(&activeAssignments)

	c.JSON(http.StatusOK, gin.H{
		"total_students":     totalStudents,
		"active_assignments": activeAssignments,
	})
}

// Ensure gradeLabel helper exists here if we are compiling the package
// We could also reuse the one from evaluation_controller.go, but Go package level funcs
// are visible across files in the same package, so gradeLabel is already defined in
// evaluation_controller.go! We can just call it natively.
// Since gradeLabel is in controllers package, it is visible.
