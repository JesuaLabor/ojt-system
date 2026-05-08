package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// GET /api/coordinator/users/pending?status=pending|active|rejected
func GetPendingUsers(c *gin.Context) {
	status := c.Query("status")
	if status == "" {
		status = "pending"
	}

	var users []models.User

	query := config.DB.Preload("Department")
	if status == "active" {
		// For active, we also include those with empty status (legacy/auto-active)
		query.Where("status = ? OR status = ? OR status IS NULL", "active", "").Find(&users)
	} else {
		query.Where("status = ?", status).Find(&users)
	}

	type response struct {
		ID             uint   `json:"id"`
		Name           string `json:"name"`
		Email          string `json:"email"`
		Role           string `json:"role"`
		Status         string `json:"status"`
		DepartmentID   *uint  `json:"department_id"`
		DepartmentName string `json:"department_name"`
		CreatedAt      string `json:"created_at"`
	}

	var res []response
	for _, u := range users {
		s := u.Status
		if s == "" {
			s = "active"
		}
		deptName := ""
		if u.Department != nil {
			deptName = u.Department.Name
		}
		res = append(res, response{
			ID:             u.ID,
			Name:           u.Name,
			Email:          u.Email,
			Role:           u.Role,
			Status:         s,
			DepartmentID:   u.DepartmentID,
			DepartmentName: deptName,
			CreatedAt:      u.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	if res == nil {
		res = []response{}
	}

	c.JSON(http.StatusOK, gin.H{"users": res})
}

// PATCH /api/coordinator/users/:id/approve
// Optionally accepts { "department_id": 1 } body to assign department on approval.
func ApproveUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if result := config.DB.First(&user, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Accept optional department assignment
	var body struct {
		DepartmentID *uint `json:"department_id"`
	}
	c.ShouldBindJSON(&body) // ignore error — body is optional

	user.Status = "active"
	if body.DepartmentID != nil {
		user.DepartmentID = body.DepartmentID
	}
	config.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{"message": "User approved successfully", "role": user.Role})
}

// PATCH /api/coordinator/users/:id/reject
func RejectUser(c *gin.Context) {
	id := c.Param("id")

	var user models.User
	if result := config.DB.First(&user, id); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Instead of deleting, we now mark as rejected
	user.Status = "rejected"
	config.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{"message": "User application rejected"})
}
