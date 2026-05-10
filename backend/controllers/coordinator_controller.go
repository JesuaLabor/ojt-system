package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── GET /api/coordinator/students ─────────────────────────────────────────────
// Returns all students with their OJT assignments, hours progress, and latest evaluation.

func GetCoordinatorStudents(c *gin.Context) {
	var assignments []models.OJTAssignment
	config.DB.Preload("Student").Preload("Supervisor").Preload("Department").Find(&assignments)

	type StudentDetail struct {
		StudentID      uint    `json:"student_id"`
		StudentName    string  `json:"student_name"`
		StudentEmail   string  `json:"student_email"`
		ProfilePhoto   string  `json:"profile_photo"`
		DepartmentName string  `json:"department_name"`
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

	for _, a := range assignments {
		totalStudents++

		// Calculate Approved Hours
		var approvedHours float64
		config.DB.Model(&models.TimeLog{}).
			Where("student_id = ? AND status = 'approved'", a.StudentID).
			Select("COALESCE(SUM(total_hours), 0)").Scan(&approvedHours)

		// Calculate Pending Hours
		var pendingHours float64
		config.DB.Model(&models.TimeLog{}).
			Where("student_id = ? AND status = 'pending'", a.StudentID).
			Select("COALESCE(SUM(total_hours), 0)").Scan(&pendingHours)

		// Count Pending Logs
		var pendingCount int64
		config.DB.Model(&models.TimeLog{}).
			Where("student_id = ? AND status = 'pending'", a.StudentID).
			Count(&pendingCount)

		// Calculate progress
		progress := 0.0
		if a.RequiredHours > 0 {
			progress = math.Round((approvedHours / a.RequiredHours) * 100)
		}

		// Find latest evaluation
		var eval models.Evaluation
		var latestScore float64
		var latestGrade string
		if result := config.DB.Where("student_id = ?", a.StudentID).Order("created_at desc").First(&eval); result.Error == nil {
			latestScore = eval.OverallScore
			latestGrade = gradeLabel(latestScore)
		} else {
			if progress >= 50 {
				pendingEvaluations++
			}
		}

		// Resolve department name: use preloaded relation
		deptName := a.Department.Name

		status := studentStatus(progress, a.StartDate, a.EndDate, a.Status)

		students = append(students, StudentDetail{
			StudentID:      a.StudentID,
			StudentName:    a.Student.Name,
			StudentEmail:   a.Student.Email,
			ProfilePhoto:   a.Student.ProfilePhoto,
			DepartmentName: deptName,
			CompanyName:    a.CompanyName,
			SupervisorName: a.Supervisor.Name,
			RequiredHours:  a.RequiredHours,
			CompletedHours: approvedHours,
			PendingHours:   pendingHours,
			ProgressPct:    progress,
			Status:         status,
			LatestScore:    latestScore,
			LatestGrade:    latestGrade,
			PendingLogs:    pendingCount,
		})

		if a.Status == "completed" || progress >= 100 {
			completedOJT++
		}
		if status == "Behind" {
			behindSchedule++
		}
	}

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

func studentStatus(progress float64, start, end time.Time, currentStatus string) string {
	if currentStatus == "completed" || progress >= 100 {
		return "Completed"
	}
	
	now := time.Now()
	if !end.IsZero() && now.After(end) && progress < 100 {
		return "Behind"
	}
	
	if progress < 25 && !start.IsZero() && now.Sub(start).Hours() > 24*30 {
		return "Behind"
	}

	return "On Track"
}

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

// ─── GET /api/coordinator/faculty ──────────────────────────────────────────────
func GetCoordinatorFaculty(c *gin.Context) {
	var faculty []models.User
	config.DB.Preload("Department").Where("role = ?", "faculty").Find(&faculty)
	c.JSON(http.StatusOK, gin.H{"faculty": faculty})
}

// ─── PATCH /api/coordinator/users/:id ──────────────────────────────────────────
type UpdateUserInput struct {
	Name         string `json:"name"`
	Role         string `json:"role"`
	Status       string `json:"status"`
	DepartmentID *uint  `json:"department_id"`
}

func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var input UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if result := config.DB.First(&user, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update only if provided
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.Role != "" {
		updates["role"] = input.Role
	}
	if input.Status != "" {
		updates["status"] = input.Status
	}
	// DepartmentID can be nullified, so we use the pointer
	updates["department_id"] = input.DepartmentID

	if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully", "user": user})
}
