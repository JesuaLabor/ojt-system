package main

import (
	"fmt"
	"ojt-system/config"
	"ojt-system/models"
	"time"
)

func main() {
	config.ConnectDB()

	assignment := models.OJTAssignment{
		StudentID:     9, // test@example.com
		CompanyName:   "Tech Innovators Inc.",
		SupervisorID:  11, // supervisor@example.com
		RequiredHours: 600,
		StartDate:     time.Now().AddDate(0, -1, 0),
		EndDate:       time.Now().AddDate(0, 3, 0),
		Status:        "active",
	}

	if err := config.DB.Create(&assignment).Error; err != nil {
		fmt.Println("Error creating assignment:", err)
		return
	}
	fmt.Println("Assignment created successfully!")
}
