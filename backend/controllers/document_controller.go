package controllers

import (
	"fmt"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// UploadDocument handles student document submissions
func UploadDocument(c *gin.Context) {
	userID, _ := c.Get("userID")
	studentID := userID.(uint)
	docType := c.PostForm("document_type")

	if docType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Document type is required"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	filename := fmt.Sprintf("%d_%s_%d%s", studentID, docType, time.Now().Unix(), filepath.Ext(file.Filename))
	savePath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	var document models.Document
	// Check if a document of this type already exists for the student
	result := config.DB.Where("student_id = ? AND type = ?", studentID, docType).First(&document)

	if result.Error == nil {
		// Update existing record
		document.FileURL = filename
		document.Status = "pending"
		config.DB.Save(&document)
	} else {
		// Create new record
		document = models.Document{
			StudentID: studentID,
			Type:      docType,
			FileURL:   filename,
			Status:    "pending",
		}
		config.DB.Create(&document)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Document uploaded successfully",
		"document": document,
	})
}

// GetMyDocuments returns all documents for the logged-in student
func GetMyDocuments(c *gin.Context) {
	userID, _ := c.Get("userID")
	studentID := userID.(uint)

	var documents []models.Document
	config.DB.Where("student_id = ?", studentID).Find(&documents)

	// Format response to match frontend expectations
	// Note: In models.Document, the field is 'Type', but frontend uses 'document_type' for clarity
	type DocResponse struct {
		ID              uint      `json:"id"`
		DocumentType    string    `json:"document_type"`
		FileURL         string    `json:"file_url"`
		Status          string    `json:"status"`
		CreatedAt       time.Time `json:"created_at"`
		RejectionReason string    `json:"rejection_reason"`
	}

	var resp []DocResponse
	for _, d := range documents {
		resp = append(resp, DocResponse{
			ID:              d.ID,
			DocumentType:    d.Type,
			FileURL:         d.FileURL,
			Status:          d.Status,
			CreatedAt:       d.CreatedAt,
			RejectionReason: d.RejectionReason,
		})
	}

	c.JSON(http.StatusOK, gin.H{"documents": resp})
}
