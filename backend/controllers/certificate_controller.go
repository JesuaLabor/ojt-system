package controllers

import (
	"fmt"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── POST /api/certificates ───────────────────────────────────────────────────
// Supervisor uploads an official Certificate of Completion PDF for a student.
// Form fields: student_id (string), pdf (file)

func UploadCertificate(c *gin.Context) {
	supervisorID, _ := c.Get("userID")

	studentIDStr := c.PostForm("student_id")
	if studentIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "student_id is required"})
		return
	}

	// Verify the student belongs to this supervisor
	var assignment models.OJTAssignment
	if err := config.DB.Where("student_id = ? AND supervisor_id = ?", studentIDStr, supervisorID).First(&assignment).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Student is not assigned to you"})
		return
	}

	// ── OJT Hours Completion Gate ─────────────────────────────────────────────
	// A certificate may only be issued once the student has rendered all required hours.
	requiredHours := 600.0
	if assignment.RequiredHours > 0 {
		requiredHours = assignment.RequiredHours
	}

	var approvedLogs []models.TimeLog
	config.DB.Where("student_id = ? AND status = 'approved'", studentIDStr).Find(&approvedLogs)
	var approvedHours float64
	for _, l := range approvedLogs {
		approvedHours += l.TotalHours
	}

	if approvedHours < requiredHours {
		c.JSON(http.StatusForbidden, gin.H{
			"error": fmt.Sprintf(
				"Cannot issue certificate: student has only completed %.1f of %.1f required OJT hours.",
				approvedHours, requiredHours,
			),
		})
		return
	}
	// ─────────────────────────────────────────────────────────────────────────

	fileHeader, err := c.FormFile("pdf")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PDF file is required"})
		return
	}

	if fileHeader.Size > 10<<20 { // 10 MB limit
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size must be under 10 MB"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}
	defer src.Close()

	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".pdf"
	}
	publicID := fmt.Sprintf("certificate_%s_%d%s", studentIDStr, time.Now().Unix(), ext)
	fileURL, err := config.UploadFile(src, publicID, "ojt-system/certificates", "raw")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload certificate: " + err.Error()})
		return
	}

	// Upsert — if a certificate already exists for this student, replace it
	var cert models.Certificate
	config.DB.Where("student_id = ?", studentIDStr).First(&cert)

	cert.StudentID = assignment.StudentID
	cert.SupervisorID = supervisorID.(uint)
	cert.FileURL = fileURL
	cert.FileName = fileHeader.Filename
	cert.IssuedAt = time.Now()

	if cert.ID == 0 {
		config.DB.Create(&cert)
	} else {
		config.DB.Save(&cert)
	}

	// Notify the student
	notification := models.Notification{
		UserID:  assignment.StudentID,
		Message: "🎓 Your supervisor has uploaded your official Certificate of Completion. You can now download it from your dashboard.",
		Link:    "/student/overview",
	}
	config.DB.Create(&notification)

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Certificate uploaded successfully",
		"certificate": cert,
	})
}

// ─── GET /api/certificates/me ─────────────────────────────────────────────────
// Student: retrieve their own certificate (if issued).

func GetMyCertificate(c *gin.Context) {
	userID, _ := c.Get("userID")

	var cert models.Certificate
	if err := config.DB.Preload("Supervisor").Where("student_id = ?", userID).First(&cert).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"certificate": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"certificate": cert})
}

// ─── GET /api/certificates/student/:student_id ────────────────────────────────
// Supervisor / Coordinator: check if a student already has a certificate.

func GetStudentCertificate(c *gin.Context) {
	studentID := c.Param("student_id")

	var cert models.Certificate
	if err := config.DB.Preload("Supervisor").Where("student_id = ?", studentID).First(&cert).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"certificate": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"certificate": cert})
}
