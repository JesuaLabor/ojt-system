package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── Input Structs ────────────────────────────────────────────────────────────

type AssignmentInput struct {
	StudentID     uint    `json:"student_id" binding:"required"`
	DepartmentID  uint    `json:"department_id" binding:"required"`
	SupervisorID  uint    `json:"supervisor_id" binding:"required"`
	CompanyName   string  `json:"company_name" binding:"required"`
	RequiredHours float64 `json:"required_hours" binding:"required,min=1"`
	StartDate     string  `json:"start_date" binding:"required"`
	EndDate       string  `json:"end_date" binding:"required"`
	WorkMode      string  `json:"work_mode"` // onsite | hybrid | remote (defaults to onsite)
}

type AssignmentUpdateInput struct {
	DepartmentID  *uint    `json:"department_id"`
	SupervisorID  *uint    `json:"supervisor_id"`
	CompanyName   *string  `json:"company_name"`
	RequiredHours *float64 `json:"required_hours"`
	StartDate     *string  `json:"start_date"`
	EndDate       *string  `json:"end_date"`
	Status        *string  `json:"status"`
	WorkMode      *string  `json:"work_mode"`
}

// ─── GET /api/assignments ──────────────────────────────────────────────────────
// List all current assignments for the coordinator data table.

func GetAssignments(c *gin.Context) {
	var assignments []models.OJTAssignment
	config.DB.Preload("Student").Preload("Department").Preload("Supervisor").Find(&assignments)

	type AssignmentDetail struct {
		ID             uint    `json:"id"`
		StudentID      uint    `json:"student_id"`
		StudentName    string  `json:"student_name"`
		DepartmentID   uint    `json:"department_id"`
		DepartmentName string  `json:"department_name"`
		CompanyName    string  `json:"company_name"`
		SupervisorID   uint    `json:"supervisor_id"`
		SupervisorName string  `json:"supervisor_name"`
		RequiredHours  float64 `json:"required_hours"`
		StartDate      string  `json:"start_date"`
		EndDate        string  `json:"end_date"`
		Status         string  `json:"status"`
		WorkMode       string  `json:"work_mode"`
	}

	var results []AssignmentDetail
	for _, a := range assignments {
		startDate := ""
		if !a.StartDate.IsZero() {
			startDate = a.StartDate.Format("2006-01-02")
		}
		endDate := ""
		if !a.EndDate.IsZero() {
			endDate = a.EndDate.Format("2006-01-02")
		}

		results = append(results, AssignmentDetail{
			ID:             a.ID,
			StudentID:      a.StudentID,
			StudentName:    a.Student.Name,
			DepartmentID:   a.DepartmentID,
			DepartmentName: a.Department.Name,
			CompanyName:    a.CompanyName,
			SupervisorID:   a.SupervisorID,
			SupervisorName: a.Supervisor.Name,
			RequiredHours:  a.RequiredHours,
			StartDate:      startDate,
			EndDate:        endDate,
			Status:         a.Status,
			WorkMode:       a.WorkMode,
		})
	}

	if results == nil {
		results = []AssignmentDetail{}
	}

	c.JSON(http.StatusOK, gin.H{"assignments": results})
}

// ─── GET /api/assignments/options ──────────────────────────────────────────────
// Returns lists of students (who don't have assignments yet) and all supervisors.

func GetAssignmentOptions(c *gin.Context) {
	// Find all students
	var allStudents []models.User
	config.DB.Where("role = 'student'").Find(&allStudents)

	// Get IDs of students who already have an active assignment
	var assigned []models.OJTAssignment
	config.DB.Find(&assigned)
	assignedMap := make(map[uint]bool)
	for _, a := range assigned {
		assignedMap[a.StudentID] = true
	}

	type Option struct {
		ID   uint   `json:"id"`
		Name string `json:"name"`
	}

	var availableStudents []Option
	for _, s := range allStudents {
		if !assignedMap[s.ID] {
			availableStudents = append(availableStudents, Option{ID: s.ID, Name: s.Name})
		}
	}

	var supervisors []models.User
	config.DB.Where("role = 'supervisor'").Find(&supervisors)
	var supervisorOptions []Option
	for _, s := range supervisors {
		supervisorOptions = append(supervisorOptions, Option{ID: s.ID, Name: s.Name})
	}

	var companies []models.Company
	config.DB.Where("status = 'active'").Order("name asc").Find(&companies)
	var companyOptions []Option
	for _, comp := range companies {
		companyOptions = append(companyOptions, Option{ID: comp.ID, Name: comp.Name})
	}

	var departments []models.Department
	config.DB.Where("status = 'active'").Order("name asc").Find(&departments)
	var departmentOptions []Option
	for _, d := range departments {
		departmentOptions = append(departmentOptions, Option{ID: d.ID, Name: d.Name})
	}

	if availableStudents == nil {
		availableStudents = []Option{}
	}
	if supervisorOptions == nil {
		supervisorOptions = []Option{}
	}
	if companyOptions == nil {
		companyOptions = []Option{}
	}
	if departmentOptions == nil {
		departmentOptions = []Option{}
	}

	c.JSON(http.StatusOK, gin.H{
		"students":    availableStudents,
		"supervisors": supervisorOptions,
		"companies":   companyOptions,
		"departments": departmentOptions,
	})
}

// ─── POST /api/assignments ─────────────────────────────────────────────────────

func CreateAssignment(c *gin.Context) {
	coordinatorID, _ := c.Get("userID")

	var input AssignmentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify student doesn't already have an assignment
	var existing models.OJTAssignment
	if result := config.DB.Where("student_id = ?", input.StudentID).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Student already has an active OJT Assignment."})
		return
	}

	startDate, _ := time.Parse("2006-01-02", input.StartDate)
	endDate, _ := time.Parse("2006-01-02", input.EndDate)

	workMode := input.WorkMode
	if workMode == "" {
		workMode = "onsite"
	}

	assignment := models.OJTAssignment{
		StudentID:     input.StudentID,
		DepartmentID:  input.DepartmentID,
		SupervisorID:  input.SupervisorID,
		CoordinatorID: coordinatorID.(uint),
		CompanyName:   input.CompanyName,
		RequiredHours: input.RequiredHours,
		StartDate:     startDate,
		EndDate:       endDate,
		Status:        "active",
		WorkMode:      workMode,
	}

	if result := config.DB.Create(&assignment); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assignment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Assignment created successfully", "assignment": assignment})
}

// ─── PATCH /api/assignments/:id ────────────────────────────────────────────────

func UpdateAssignment(c *gin.Context) {
	id := c.Param("id")

	var assignment models.OJTAssignment
	if err := config.DB.First(&assignment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	var input AssignmentUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.DepartmentID != nil {
		assignment.DepartmentID = *input.DepartmentID
	}
	if input.CompanyName != nil {
		assignment.CompanyName = *input.CompanyName
	}
	if input.SupervisorID != nil {
		assignment.SupervisorID = *input.SupervisorID
	}
	if input.RequiredHours != nil {
		assignment.RequiredHours = *input.RequiredHours
	}
	if input.Status != nil {
		assignment.Status = *input.Status
	}
	if input.WorkMode != nil {
		assignment.WorkMode = *input.WorkMode
	}
	if input.StartDate != nil {
		parsed, _ := time.Parse("2006-01-02", *input.StartDate)
		assignment.StartDate = parsed
	}
	if input.EndDate != nil {
		parsed, _ := time.Parse("2006-01-02", *input.EndDate)
		assignment.EndDate = parsed
	}

	config.DB.Save(&assignment)
	c.JSON(http.StatusOK, gin.H{"message": "Assignment updated successfully"})
}

// ─── DELETE /api/assignments/:id ───────────────────────────────────────────────

func DeleteAssignment(c *gin.Context) {
	id := c.Param("id")

	var assignment models.OJTAssignment
	if err := config.DB.First(&assignment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return
	}

	// Unscoped to permanently delete, or Soft Delete. We'll use soft delete (GORM default if deleted_at exists).
	config.DB.Delete(&assignment)

	c.JSON(http.StatusOK, gin.H{"message": "Assignment deleted successfully"})
}
