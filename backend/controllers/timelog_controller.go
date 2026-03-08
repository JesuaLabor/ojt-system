package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"time"

	"github.com/gin-gonic/gin"
)

// POST /api/timelogs - Clock In
func ClockIn(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Check if already clocked in
	var existing models.TimeLog
	result := config.DB.Where("student_id = ? AND clock_out IS NULL", userID).First(&existing)
	if result.Error == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You are already clocked in"})
		return
	}

	log := models.TimeLog{
		StudentID: userID.(uint),
		ClockIn:   time.Now(),
		Status:    "pending",
	}

	config.DB.Create(&log)
	c.JSON(http.StatusCreated, gin.H{"message": "Clocked in successfully", "log": log})
}

// PATCH /api/timelogs/clockout - Clock Out
func ClockOut(c *gin.Context) {
	userID, _ := c.Get("userID")

	var log models.TimeLog
	result := config.DB.Where("student_id = ? AND clock_out IS NULL", userID).First(&log)
	if result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active clock-in found"})
		return
	}

	now := time.Now()
	duration := now.Sub(log.ClockIn).Hours()
	totalHours := math.Round(duration*100) / 100

	log.ClockOut = &now
	log.TotalHours = totalHours
	config.DB.Save(&log)

	c.JSON(http.StatusOK, gin.H{"message": "Clocked out successfully", "log": log})
}

// GET /api/timelogs - Get student's own logs
func GetMyTimeLogs(c *gin.Context) {
	userID, _ := c.Get("userID")
	var logs []models.TimeLog
	config.DB.Where("student_id = ?", userID).Order("created_at desc").Find(&logs)
	c.JSON(http.StatusOK, logs)
}

// GET /api/timelogs/:student_id - Coordinator/Supervisor get student logs
func GetStudentTimeLogs(c *gin.Context) {
	studentID := c.Param("student_id")
	var logs []models.TimeLog
	config.DB.Where("student_id = ?", studentID).Order("created_at desc").Find(&logs)
	c.JSON(http.StatusOK, logs)
}

// PATCH /api/timelogs/:id/approve
func ApproveTimeLog(c *gin.Context) {
	id := c.Param("id")
	approverID, _ := c.Get("userID")

	var log models.TimeLog
	if result := config.DB.First(&log, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
		return
	}

	uid := approverID.(uint)
	log.Status = "approved"
	log.ApprovedBy = &uid
	config.DB.Save(&log)

	c.JSON(http.StatusOK, gin.H{"message": "Time log approved", "log": log})
}

// PATCH /api/timelogs/:id/reject
func RejectTimeLog(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Remarks string `json:"remarks"`
	}
	c.ShouldBindJSON(&input)

	var log models.TimeLog
	if result := config.DB.First(&log, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
		return
	}

	log.Status = "rejected"
	log.Remarks = input.Remarks
	config.DB.Save(&log)

	c.JSON(http.StatusOK, gin.H{"message": "Time log rejected", "log": log})
}
