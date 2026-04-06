package controllers

import (
	"fmt"
	"net/http"
	"ojt-system/config"
	"ojt-system/middleware"
	"ojt-system/models"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// ─── Input Structs ───────────────────────────────────────────────────────────

type RegisterInput struct {
	Name     string `json:"name"     binding:"required"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role"     binding:"required,oneof=student supervisor coordinator faculty"`
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileInput struct {
	Name         string `json:"name"`
	ProfilePhoto string `json:"profile_photo"`
}

type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password"     binding:"required,min=6"`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func generateToken(user models.User) (string, error) {
	claims := middleware.Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.GetEnv("JWT_SECRET", "secret")))
}

func userResponse(user models.User) gin.H {
	// Fallback to active for older rows
	status := user.Status
	if status == "" {
		status = "active"
	}

	return gin.H{
		"id":            user.ID,
		"name":          user.Name,
		"email":         user.Email,
		"role":          user.Role,
		"status":        status,
		"profile_photo": user.ProfilePhoto,
		"created_at":    user.CreatedAt,
	}
}

// ─── POST /api/auth/register ─────────────────────────────────────────────────

func Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password with bcrypt
	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Coordinators and Faculty default to "active" so they can approve others. Students/Supervisors are "pending".
	status := "pending"
	if input.Role == "coordinator" || input.Role == "faculty" {
		status = "active"
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: string(hashed),
		Role:     input.Role,
		Status:   status,
	}

	if result := config.DB.Create(&user); result.Error != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	tokenStr, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"token":   tokenStr,
		"user":    userResponse(user),
	})
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if result := config.DB.Where("email = ?", input.Email).First(&user); result.Error != nil {
		// Generic message to avoid user enumeration
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if user.Status == "rejected" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account application has been rejected. Please contact the coordinator."})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	tokenStr, err := generateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenStr,
		"user":  userResponse(user),
	})
}

// ─── GET /api/me ──────────────────────────────────────────────────────────────

func GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if result := config.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, userResponse(user))
}

// ─── PUT /api/me ──────────────────────────────────────────────────────────────

func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if result := config.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Only update fields that were provided
	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
	}
	if input.ProfilePhoto != "" {
		updates["profile_photo"] = input.ProfilePhoto
	}

	config.DB.Model(&user).Updates(updates)
	config.DB.First(&user, userID) // Reload updated record

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
		"user":    userResponse(user),
	})
}

// ─── POST /api/me/avatar ──────────────────────────────────────────────────────

func UploadAvatar(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
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

	// Make unique filename
	filename := fmt.Sprintf("avatar_%v_%d%s", userID, time.Now().Unix(), filepath.Ext(file.Filename))
	savePath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update user profile_photo
	fileURL := fmt.Sprintf("http://localhost:8080/uploads/%s", filename)

	var user models.User
	if result := config.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	config.DB.Model(&user).Update("profile_photo", fileURL)

	c.JSON(http.StatusOK, gin.H{
		"message":       "Avatar uploaded successfully",
		"profile_photo": fileURL,
		"user":          userResponse(user),
	})
}

// ─── POST /api/auth/change-password ──────────────────────────────────────────

func ChangePassword(c *gin.Context) {
	userID, _ := c.Get("userID")

	var input ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if result := config.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	hashed, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
		return
	}

	config.DB.Model(&user).Update("password", string(hashed))

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}
