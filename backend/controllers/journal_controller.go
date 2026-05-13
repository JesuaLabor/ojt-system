package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetStudentJournals - Student fetches their own journals
func GetStudentJournals(c *gin.Context) {
	userID, _ := c.Get("userID")

	var journals []models.Journal
	config.DB.Where("student_id = ?", userID).Preload("Supervisor", "id, name").Order("date desc").Find(&journals)

	c.JSON(http.StatusOK, gin.H{"journals": journals})
}

// CreateJournal - Student creates a new journal entry
func CreateJournal(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Date      string `json:"date" binding:"required"`
		Tasks     string `json:"tasks" binding:"required"`
		Learnings string `json:"learnings" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find the student's assignment to get their supervisor
	var assignment models.OJTAssignment
	if err := config.DB.Where("student_id = ? AND status = 'active'", userID).First(&assignment).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You must have an active assignment to submit a journal."})
		return
	}

	// Parse date string to time.Time
	// Usually date comes as YYYY-MM-DD string
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format."})
		return
	}

	journal := models.Journal{
		StudentID:    userID.(uint),
		SupervisorID: assignment.SupervisorID,
		Date:         date,
		Tasks:        req.Tasks,
		Learnings:    req.Learnings,
		Status:       "pending",
	}

	if err := config.DB.Create(&journal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create journal."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Journal submitted successfully!", "journal": journal})
}

// GetSupervisorJournals - Supervisor fetches journals for their assigned students
func GetSupervisorJournals(c *gin.Context) {
	userID, _ := c.Get("userID")

	var journals []models.Journal
	config.DB.Where("supervisor_id = ?", userID).Preload("Student", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, profile_photo, department_id")
	}).Preload("Student.Department").Order("date desc").Find(&journals)

	c.JSON(http.StatusOK, gin.H{"journals": journals})
}

// ReviewJournal - Supervisor acknowledges or rejects and optionally adds feedback
func ReviewJournal(c *gin.Context) {
	userID, _ := c.Get("userID")
	journalID := c.Param("id")

	var req struct {
		Status   string `json:"status" binding:"required,oneof=acknowledged rejected"`
		Feedback string `json:"feedback"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var journal models.Journal
	if err := config.DB.Where("id = ? AND supervisor_id = ?", journalID, userID).First(&journal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journal not found or unauthorized."})
		return
	}

	journal.Status = req.Status
	journal.Feedback = req.Feedback

	if err := config.DB.Save(&journal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to review journal."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Journal " + req.Status + " successfully!", "journal": journal})
}

// GetCoordinatorJournals - Coordinator/Admin/Faculty fetches acknowledged journals
func GetCoordinatorJournals(c *gin.Context) {
	var journals []models.Journal
	config.DB.Where("status = ?", "acknowledged").Preload("Student", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, profile_photo, department_id")
	}).Preload("Student.Department").Preload("Supervisor", "id, name").Order("date desc").Find(&journals)

	c.JSON(http.StatusOK, gin.H{"journals": journals})
}
