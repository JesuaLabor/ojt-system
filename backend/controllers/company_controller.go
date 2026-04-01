package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

type CompanyInput struct {
	Name          string `json:"name" binding:"required"`
	Address       string `json:"address"`
	ContactPerson string `json:"contact_person"`
	ContactEmail  string `json:"contact_email"`
	ContactPhone  string `json:"contact_phone"`
	Status        string `json:"status"`
}

type CompanyDetail struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	Address       string `json:"address"`
	ContactPerson string `json:"contact_person"`
	ContactEmail  string `json:"contact_email"`
	ContactPhone  string `json:"contact_phone"`
	Status        string `json:"status"`
}

// GetCompanies returns all companies
func GetCompanies(c *gin.Context) {
	var companies []models.Company
	config.DB.Order("name asc").Find(&companies)

	results := []CompanyDetail{}
	for _, comp := range companies {
		results = append(results, CompanyDetail{
			ID:            comp.ID,
			Name:          comp.Name,
			Address:       comp.Address,
			ContactPerson: comp.ContactPerson,
			ContactEmail:  comp.ContactEmail,
			ContactPhone:  comp.ContactPhone,
			Status:        comp.Status,
		})
	}

	c.JSON(http.StatusOK, gin.H{"companies": results})
}

// CreateCompany creates a new company
func CreateCompany(c *gin.Context) {
	var input CompanyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	company := models.Company{
		Name:          input.Name,
		Address:       input.Address,
		ContactPerson: input.ContactPerson,
		ContactEmail:  input.ContactEmail,
		ContactPhone:  input.ContactPhone,
		Status:        "active",
	}

	if input.Status != "" {
		company.Status = input.Status
	}

	if result := config.DB.Create(&company); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create company"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Company created successfully", "company": company})
}

// UpdateCompany updates an existing company
func UpdateCompany(c *gin.Context) {
	id := c.Param("id")
	var company models.Company
	if err := config.DB.First(&company, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	var input CompanyInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	company.Name = input.Name
	company.Address = input.Address
	company.ContactPerson = input.ContactPerson
	company.ContactEmail = input.ContactEmail
	company.ContactPhone = input.ContactPhone
	if input.Status != "" {
		company.Status = input.Status
	}

	config.DB.Save(&company)
	c.JSON(http.StatusOK, gin.H{"message": "Company updated successfully", "company": company})
}

// DeleteCompany deletes a company
func DeleteCompany(c *gin.Context) {
	id := c.Param("id")
	var company models.Company
	if err := config.DB.First(&company, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	config.DB.Delete(&company)
	c.JSON(http.StatusOK, gin.H{"message": "Company deleted successfully"})
}
