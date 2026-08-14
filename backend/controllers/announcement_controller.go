package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// GetAnnouncements returns announcements relevant to the user
func GetAnnouncements(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var announcements []models.Announcement
	query := config.DB.Preload("Author")

	// Filter by target based on role
	if userRole == "student" {
		query = query.Where("target IN ?", []string{"all", "students"})
	} else if userRole == "supervisor" {
		query = query.Where("target IN ?", []string{"all", "supervisors"})
	}

	if err := query.Order("created_at desc").Find(&announcements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	// Auto-mark announcement notifications as read when user views announcements
	res := config.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ? AND (link LIKE '%/announcements' OR message LIKE '📢 Announcement%')", userID, false).
		Update("is_read", true)

	if res.RowsAffected > 0 {
		if uID, ok := userID.(uint); ok {
			notifJSON, _ := json.Marshal(map[string]interface{}{
				"type": "notifications_updated",
			})
			MainHub.BroadcastToUser(uID, notifJSON)
		}
	}

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
	config.DB.Preload("Author").First(&announcement, announcement.ID)

	// Notify targeted users about the new announcement
	var targetUsers []models.User
	userQuery := config.DB.Where("id != ?", userID.(uint)) // Don't notify the author

	switch target {
	case "students":
		userQuery = userQuery.Where("role = 'student'")
	case "supervisors":
		userQuery = userQuery.Where("role = 'supervisor'")
	case "faculty":
		userQuery = userQuery.Where("role = 'faculty'")
	case "coordinators":
		userQuery = userQuery.Where("role = 'coordinator'")
	case "all":
		// All users except author
	}

	userQuery.Find(&targetUsers)

	for _, targetUser := range targetUsers {
		link := fmt.Sprintf("/%s/announcements", targetUser.Role)
		notif := models.Notification{
			UserID:  targetUser.ID,
			Message: fmt.Sprintf("📢 Announcement: \"%s\"", req.Title),
			Link:    link,
		}
		config.DB.Create(&notif)

		// Broadcast real-time WebSocket event for immediate notification pop-up
		notifJSON, _ := json.Marshal(map[string]interface{}{
			"type":         "new_notification",
			"notification": notif,
			"announcement": announcement,
		})
		MainHub.BroadcastToUser(targetUser.ID, notifJSON)
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Announcement posted successfully", "announcement": announcement})
}

// DeleteAnnouncement deletes an announcement
func DeleteAnnouncement(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	announcementID := c.Param("id")

	var announcement models.Announcement
	if err := config.DB.First(&announcement, announcementID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// Only author or admin can delete
	if userRole != "admin" && announcement.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have permission to delete this announcement"})
		return
	}

	if err := config.DB.Delete(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}
