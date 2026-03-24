package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Fetches all notifications for the currently authenticated user, ordered by newest first.

func GetMyNotifications(c *gin.Context) {
	userID, _ := c.Get("userID")

	var notifications []models.Notification
	config.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&notifications)

	// Calculate unread count
	var unreadCount int64
	config.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"unread_count":  unreadCount,
	})
}

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
// Marks a specific notification as true (read).

func MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var notification models.Notification
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found or unauthorized"})
		return
	}

	notification.IsRead = true
	config.DB.Save(&notification)

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// Marks all notifications for this user as read.

func MarkAllNotificationsReadGlobal(c *gin.Context) {
	userID, _ := c.Get("userID")

	config.DB.Model(&models.Notification{}).Where("user_id = ?", userID).Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}
