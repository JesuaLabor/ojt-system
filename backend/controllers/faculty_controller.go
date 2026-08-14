package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── GET /api/faculty/students ──────────────────────────────────────────────
// Faculty can only view students who belong to the same department as them.
// Returns a trimmed, academic-focused payload (no email, no pending_logs).

func GetFacultyStudents(c *gin.Context) {
	userID, _ := c.Get("userID")

	// 1. Fetch the faculty member's own record to get their department
	var faculty models.User
	if result := config.DB.First(&faculty, userID); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Faculty user not found"})
		return
	}

	// 2. Faculty must belong to a department — otherwise return empty list
	if faculty.DepartmentID == nil {
		c.JSON(http.StatusOK, gin.H{
			"summary":  gin.H{"total_students": 0},
			"students": []interface{}{},
		})
		return
	}

	// 3. Fetch assignments scoped to the faculty's department only
	companyName := c.Query("company_name")
	query := config.DB.
		Preload("Student").
		Preload("Department").
		Where("department_id = ?", *faculty.DepartmentID)

	if companyName != "" {
		query = query.Where("company_name = ?", companyName)
	}

	var assignments []models.OJTAssignment
	query.Find(&assignments)

	// 4. Build a trimmed, faculty-appropriate response
	type FacultyStudentView struct {
		StudentID      uint    `json:"student_id"`
		StudentName    string  `json:"student_name"`
		ProfilePhoto   string  `json:"profile_photo"`
		DepartmentName string  `json:"department_name"`
		CompanyName    string  `json:"company_name"`
		RequiredHours  float64 `json:"required_hours"`
		CompletedHours float64 `json:"completed_hours"`
		ProgressPct    float64 `json:"progress_pct"`
		Status         string  `json:"status"`
		LatestScore    float64 `json:"latest_score"`
		LatestGrade    string  `json:"latest_grade"`
		LastActive     string  `json:"last_active"`
		DaysInactive   int     `json:"days_inactive"`
	}

	var students []FacultyStudentView
	completedOJT := 0
	behindSchedule := 0
	atRiskStudents := 0
	evaluatedCount := 0
	pendingEvaluations := 0

	for _, a := range assignments {
		// Sum approved hours
		var approvedHours float64
		config.DB.Model(&models.TimeLog{}).
			Where("student_id = ? AND status = 'approved'", a.StudentID).
			Select("COALESCE(SUM(total_hours), 0)").
			Scan(&approvedHours)

		// Calculate progress percentage
		progress := 0.0
		if a.RequiredHours > 0 {
			progress = math.Round((approvedHours/a.RequiredHours)*100*100) / 100
		}
		if progress > 100 {
			progress = 100
		}

		// Find Last Activity
		var lastActiveStr string = "Never"
		var daysInactive int
		var lastLogs []models.TimeLog
		if config.DB.Where("student_id = ?", a.StudentID).Order("clock_in desc").Limit(1).Find(&lastLogs); len(lastLogs) > 0 {
			lastLog := lastLogs[0]
			lastActiveStr = lastLog.ClockIn.Format("2006-01-02")
			daysInactive = int(time.Since(lastLog.ClockIn).Hours() / 24)
		} else {
			if !a.StartDate.IsZero() {
				daysInactive = int(time.Since(a.StartDate).Hours() / 24)
				if daysInactive < 0 { daysInactive = 0 }
			}
		}

		if daysInactive >= 3 {
			atRiskStudents++
		}

		// Latest evaluation score
		var latestScore float64
		var latestGrade string
		var evals []models.Evaluation
		if config.DB.Where("student_id = ?", a.StudentID).Order("created_at desc").Limit(1).Find(&evals); len(evals) > 0 {
			eval := evals[0]
			latestScore = eval.OverallScore
			latestGrade = gradeLabel(latestScore) // reuse helper from coordinator_controller.go
		}

		status := studentStatus(progress, a.StartDate, a.EndDate, a.Status) // reuse helper
		if a.Status == "completed" || progress >= 100 {
			completedOJT++
		}
		if status == "Behind" {
			behindSchedule++
		}

		if latestScore > 0 {
			evaluatedCount++
		} else {
			pendingEvaluations++
		}

		students = append(students, FacultyStudentView{
			StudentID:      a.StudentID,
			StudentName:    a.Student.Name,
			ProfilePhoto:   a.Student.ProfilePhoto,
			DepartmentName: a.Department.Name,
			CompanyName:    a.CompanyName,
			RequiredHours:  a.RequiredHours,
			CompletedHours: math.Round(approvedHours*100) / 100,
			ProgressPct:    progress,
			Status:         status,
			LatestScore:    latestScore,
			LatestGrade:    latestGrade,
			LastActive:     lastActiveStr,
			DaysInactive:   daysInactive,
		})
	}

	if students == nil {
		students = []FacultyStudentView{}
	}

	// Resolve department name safely
	deptName := ""
	if len(assignments) > 0 {
		deptName = assignments[0].Department.Name
	} else {
		var dept models.Department
		config.DB.First(&dept, *faculty.DepartmentID)
		deptName = dept.Name
	}

	c.JSON(http.StatusOK, gin.H{
		"summary": gin.H{
			"total_students":      len(students),
			"completed_ojt":       completedOJT,
			"behind_schedule":     behindSchedule,
			"at_risk_students":    atRiskStudents,
			"evaluated_count":     evaluatedCount,
			"pending_evaluations": pendingEvaluations,
			"department_id":       faculty.DepartmentID,
			"department_name":     deptName,
			"has_department":      faculty.DepartmentID != nil,
		},
		"students": students,
	})
}
