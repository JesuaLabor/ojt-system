package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"path/filepath"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
)

// GetContacts returns a list of available contacts to message with unread counts
func GetContacts(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	uid, ok := userIDVal.(uint)
	if !ok {
		uid = uint(userIDVal.(float64))
	}
	userID := uid

	var contacts []models.User
	// Allow all users to communicate regardless of role
	config.DB.Preload("Department").Where("id != ?", userID).Find(&contacts)

	// Final structure for contacts with unread counts and sorting info
	type ContactInfo struct {
		models.User
		UnreadCount     int64     `json:"unread_count"`
		LastMessage     string    `json:"last_message"`
		LastMessageAt   time.Time `json:"last_message_at"`
		IsLastSender    bool      `json:"is_last_sender"`
		HasConversation bool      `json:"has_conversation"`
		IsOnline        bool      `json:"is_online"`
	}
	var results []ContactInfo

	for _, contact := range contacts {
		isOnline := MainHub.IsUserOnline(contact.ID)
		var unread int64
		config.DB.Model(&models.Message{}).
			Where("sender_id = ? AND receiver_id = ? AND is_read = ?", contact.ID, userID, false).
			Count(&unread)

		var lastMessages []models.Message
		config.DB.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			userID, contact.ID, contact.ID, userID).
			Order("created_at desc").Limit(1).Find(&lastMessages)

		hasConversation := len(lastMessages) > 0
		lastMsgStr := ""
		isLastSender := false

		var lastMsg models.Message
		if hasConversation {
			lastMsg = lastMessages[0]
			if lastMsg.Content != "" {
				lastMsgStr = lastMsg.Content
			} else if lastMsg.FileUrl != "" {
				if lastMsg.FileType == "image" {
					lastMsgStr = "Sent an image"
				} else {
					lastMsgStr = "Sent an attachment"
				}
			}
			isLastSender = lastMsg.SenderID == userID
		}

		// Fallback for department if missing on User (common for students)
		if contact.Department == nil {
			var assignment models.OJTAssignment
			if config.DB.Preload("Department").Where("student_id = ?", contact.ID).First(&assignment).Error == nil && assignment.Department.ID != 0 {
				contact.Department = &assignment.Department
			}
		}

		results = append(results, ContactInfo{
			User:            contact,
			UnreadCount:     unread,
			LastMessage:     lastMsgStr,
			LastMessageAt:   lastMsg.CreatedAt,
			IsLastSender:    isLastSender,
			HasConversation: hasConversation,
			IsOnline:        isOnline,
		})
	}

	// Sort by LastMessageAt desc
	sort.Slice(results, func(i, j int) bool {
		return results[i].LastMessageAt.After(results[j].LastMessageAt)
	})

	c.JSON(http.StatusOK, gin.H{"contacts": results})
}

// GetConversation returns message history between two users
func GetConversation(c *gin.Context) {
	userID, _ := c.Get("userID")
	contactID := c.Param("contactId")

	var messages []models.Message
	config.DB.Preload("Sender", "id, name, profile_photo").
		Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
			userID, contactID, contactID, userID).
		Order("created_at asc").Find(&messages)

	// Mark received messages as read
	result := config.DB.Model(&models.Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = ?", contactID, userID, false).
		Update("is_read", true)

	// Auto-mark message notifications for this user as read
	var contactUser models.User
	if config.DB.Select("id, name").First(&contactUser, contactID).Error == nil {
		config.DB.Model(&models.Notification{}).
			Where("user_id = ? AND is_read = ? AND (link LIKE '%/messages' OR message LIKE ?)",
				userID, false, "%"+contactUser.Name+"%").
			Update("is_read", true)
	} else {
		config.DB.Model(&models.Notification{}).
			Where("user_id = ? AND is_read = ? AND link LIKE '%/messages'", userID, false).
			Update("is_read", true)
	}

	if uID, ok := userID.(uint); ok {
		notifJSON, _ := json.Marshal(map[string]interface{}{
			"type": "notifications_updated",
		})
		MainHub.BroadcastToUser(uID, notifJSON)
	}

	if result.RowsAffected > 0 {
		var contactIDUint uint
		fmt.Sscanf(contactID, "%d", &contactIDUint)
		readJSON, _ := json.Marshal(map[string]interface{}{
			"type":      "messages_read",
			"reader_id": userID,
		})
		MainHub.BroadcastToUser(contactIDUint, readJSON)
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

// SendMessage sends a new message (supports optional file attachments)
func SendMessage(c *gin.Context) {
	userID, _ := c.Get("userID")

	// Handle multipart form for optional files
	content := c.PostForm("content")
	receiverIDStr := c.PostForm("receiver_id")

	if receiverIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Receiver ID is required"})
		return
	}

	var receiverID uint
	if _, err := fmt.Sscanf(receiverIDStr, "%d", &receiverID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid receiver ID"})
		return
	}

	var fileURL, fileType string
	file, header, err := c.Request.FormFile("file")
	if err == nil {
		// File is present, upload it
		defer file.Close()

		ext := filepath.Ext(header.Filename)
		publicID := fmt.Sprintf("msg_%d_%d", userID, time.Now().Unix())

		// Determine resource type
		resourceType := "raw"
		fileType = "document"
		if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp" {
			resourceType = "image"
			fileType = "image"
		}

		fileURL, err = config.UploadFile(file, publicID, "ojt-system/messages", resourceType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file: " + err.Error()})
			return
		}
	}

	message := models.Message{
		SenderID:   userID.(uint),
		ReceiverID: receiverID,
		Content:    content,
		FileUrl:    fileURL,
		FileType:   fileType,
	}

	if err := config.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	// Fetch back with sender info for UI
	config.DB.Preload("Sender", "id, name, profile_photo").First(&message, message.ID)

	// Create persistent notification for receiver
	var receiverUser models.User
	var senderUser models.User
	var createdNotif models.Notification
	config.DB.First(&senderUser, message.SenderID)
	if err := config.DB.First(&receiverUser, message.ReceiverID).Error; err == nil {
		snippet := content
		if snippet == "" && fileURL != "" {
			if fileType == "image" {
				snippet = "Sent an image attachment"
			} else {
				snippet = "Sent a document attachment"
			}
		} else if len(snippet) > 50 {
			snippet = snippet[:47] + "..."
		}

		link := fmt.Sprintf("/%s/messages", receiverUser.Role)

		createdNotif = models.Notification{
			UserID:  message.ReceiverID,
			Message: fmt.Sprintf("💬 New message from %s: \"%s\"", senderUser.Name, snippet),
			Link:    link,
		}
		config.DB.Create(&createdNotif)
	}

	// Broadcast via WS including notification update
	msgJSON, _ := json.Marshal(map[string]interface{}{
		"type":         "new_message",
		"message":      message,
		"notification": createdNotif,
	})
	MainHub.BroadcastToUser(message.ReceiverID, msgJSON)

	c.JSON(http.StatusCreated, gin.H{"message": message})
}

// GetUnreadCount returns total unread messages for the user
func GetUnreadCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	var count int64
	config.DB.Model(&models.Message{}).Where("receiver_id = ? AND is_read = ?", userID, false).Count(&count)
	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}

// ReactToMessage updates the reaction on a message
func ReactToMessage(c *gin.Context) {
	messageID := c.Param("id")
	var input struct {
		Reaction string `json:"reaction"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var message models.Message
	if err := config.DB.First(&message, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	// Update reaction
	message.Reaction = input.Reaction
	if err := config.DB.Save(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reaction"})
		return
	}

	// Broadcast the reaction via WebSocket
	MainHub.BroadcastEvent(map[string]interface{}{
		"type":    "reaction",
		"message": message,
	})

	c.JSON(http.StatusOK, message)
}
