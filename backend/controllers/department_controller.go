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

// ─── Input Structs ────────────────────────────────────────────────────────────

type DepartmentInput struct {
	Name        string `json:"name"        binding:"required"`
	Code        string `json:"code"        binding:"required"`
	Description string `json:"description"`
}

type DepartmentUpdateInput struct {
	Name        *string `json:"name"`
	Code        *string `json:"code"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
}

// deptToMap converts a Department to a gin.H with lowercase keys.
// gorm.Model serializes ID as uppercase "ID" by default, which breaks frontend
// lookups via dept.id. This helper ensures all responses use lowercase keys.
func deptToMap(d models.Department) gin.H {
	return gin.H{
		"id":            d.ID,
		"name":          d.Name,
		"code":          d.Code,
		"description":   d.Description,
		"status":        d.Status,
		"profile_image": d.ProfileImage,
		"created_at":    d.CreatedAt,
	}
}

// ─── GET /api/departments ─────────────────────────────────────────────────────
// Any authenticated user can list departments (for dropdowns on registration, etc.)

func GetDepartments(c *gin.Context) {
	var departments []models.Department
	config.DB.Where("status = 'active'").Order("name asc").Find(&departments)

	result := make([]gin.H, 0, len(departments))
	for _, d := range departments {
		result = append(result, deptToMap(d))
	}

	c.JSON(http.StatusOK, gin.H{
		"total":       len(result),
		"departments": result,
	})
}

// ─── GET /api/departments/:id/members ────────────────────────────────────────
// Coordinator/Admin: view all users grouped by role under a department.

func GetDepartmentMembers(c *gin.Context) {
	id := c.Param("id")

	var dept models.Department
	if result := config.DB.First(&dept, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Department not found"})
		return
	}

	type MemberDetail struct {
		ID           uint   `json:"id"`
		Name         string `json:"name"`
		Email        string `json:"email"`
		Role         string `json:"role"`
		Status       string `json:"status"`
		ProfilePhoto string `json:"profile_photo"`
	}

	var users []models.User
	config.DB.Where("department_id = ?", id).Find(&users)

	students := []MemberDetail{}
	supervisors := []MemberDetail{}
	faculty := []MemberDetail{}

	for _, u := range users {
		m := MemberDetail{
			ID:           u.ID,
			Name:         u.Name,
			Email:        u.Email,
			Role:         u.Role,
			Status:       u.Status,
			ProfilePhoto: u.ProfilePhoto,
		}
		switch u.Role {
		case "student":
			students = append(students, m)
		case "supervisor":
			supervisors = append(supervisors, m)
		case "faculty":
			faculty = append(faculty, m)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"department": gin.H{
			"id":          dept.ID,
			"name":        dept.Name,
			"code":        dept.Code,
			"description": dept.Description,
			"status":      dept.Status,
		},
		"members": gin.H{
			"students":    students,
			"supervisors": supervisors,
			"faculty":     faculty,
			"total":       len(users),
		},
	})
}

// ─── POST /api/departments ────────────────────────────────────────────────────
// Coordinator/Admin: create a new department.

func CreateDepartment(c *gin.Context) {
	var input DepartmentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check for duplicate name or code
	var existing models.Department
	if result := config.DB.Where("name = ? OR code = ?", input.Name, input.Code).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "A department with that name or code already exists"})
		return
	}

	dept := models.Department{
		Name:        input.Name,
		Code:        input.Code,
		Description: input.Description,
		Status:      "active",
	}

	if result := config.DB.Create(&dept); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create department"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Department created successfully",
		"department": deptToMap(dept),
	})
}

// ─── PATCH /api/departments/:id ───────────────────────────────────────────────
// Coordinator/Admin: update department info.

func UpdateDepartment(c *gin.Context) {
	id := c.Param("id")

	var dept models.Department
	if result := config.DB.First(&dept, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Department not found"})
		return
	}

	var input DepartmentUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Code != nil {
		updates["code"] = *input.Code
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.Status != nil {
		updates["status"] = *input.Status
	}

	if result := config.DB.Model(&dept).Updates(updates); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update department"})
		return
	}

	config.DB.First(&dept, id) // reload updated record

	c.JSON(http.StatusOK, gin.H{
		"message":    "Department updated successfully",
		"department": deptToMap(dept),
	})
}

// ─── DELETE /api/departments/:id ──────────────────────────────────────────────
// Coordinator/Admin: soft-delete (deactivate) a department.

func DeleteDepartment(c *gin.Context) {
	id := c.Param("id")

	var dept models.Department
	if result := config.DB.First(&dept, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Department not found"})
		return
	}

	// Check if department has active members
	var memberCount int64
	config.DB.Model(&models.User{}).Where("department_id = ? AND status = 'active'", id).Count(&memberCount)
	if memberCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error":        "Cannot delete a department with active members. Reassign them first.",
			"member_count": memberCount,
		})
		return
	}

	config.DB.Delete(&dept) // soft delete via GORM

	c.JSON(http.StatusOK, gin.H{"message": "Department deleted successfully"})
}

// ─── POST /api/departments/:id/image ──────────────────────────────────────────
// Coordinator/Admin: upload a profile image for the department.

func UploadDepartmentImage(c *gin.Context) {
	id := c.Param("id")

	var dept models.Department
	if result := config.DB.First(&dept, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Department not found"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}
	defer src.Close()

	// Build a safe filename: dept_<id>_<unix_timestamp>.<ext>
	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	publicID := fmt.Sprintf("dept_%s_%d%s", id, time.Now().Unix(), ext)
	fileURL, err := config.UploadImage(src, publicID, "ojt-system/departments")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload image: " + err.Error()})
		return
	}

	// Update department record
	config.DB.Model(&dept).Update("profile_image", fileURL)
	config.DB.First(&dept, id) // reload

	c.JSON(http.StatusOK, gin.H{
		"message":       "Image uploaded successfully",
		"profile_image": fileURL,
		"department":    deptToMap(dept),
	})
}

