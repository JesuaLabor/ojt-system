package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// GetAnnouncements returns announcements relevant to the user
func GetAnnouncements(c *gin.Context) {
	role, _ := c.Get("role")

	var announcements []models.Announcement
	query := config.DB.Preload("Author", "id, name, role, profile_photo")

	// Filter by target based on role
	if role == "student" {
		query = query.Where("target IN ?", []string{"all", "students"})
	} else if role == "supervisor" {
		query = query.Where("target IN ?", []string{"all", "supervisors"})
	}

	query.Order("created_at desc").Find(&announcements)

	c.JSON(http.StatusOK, gin.H{"announcements": announcements})
}

// CreateAnnouncement creates a new announcement
func CreateAnnouncement(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
		Target  string `json:"target"` // defaults to all
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	target := req.Target
	if target == "" {
		target = "all"
	}

	announcement := models.Announcement{
		Title:    req.Title,
		Content:  req.Content,
		AuthorID: userID.(uint),
		Target:   target,
	}

	if err := config.DB.Create(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	// Preload author for the response
	config.DB.Preload("Author", "id, name, role, profile_photo").First(&announcement, announcement.ID)

	c.JSON(http.StatusCreated, gin.H{"message": "Announcement posted successfully", "announcement": announcement})
}

// DeleteAnnouncement deletes an announcement
func DeleteAnnouncement(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	announcementID := c.Param("id")

	var announcement models.Announcement
	if err := config.DB.First(&announcement, announcementID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// Only author or admin can delete
	if role != "admin" && announcement.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this announcement"})
		return
	}

	if err := config.DB.Delete(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}
