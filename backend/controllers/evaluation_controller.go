package controllers

import (
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

type EvaluationInput struct {
	StudentID          uint    `json:"student_id" binding:"required"`
	Period             string  `json:"period" binding:"required"`
	TechnicalScore     float64 `json:"technical_score" binding:"required,min=0,max=100"`
	CommunicationScore float64 `json:"communication_score" binding:"required,min=0,max=100"`
	PunctualityScore   float64 `json:"punctuality_score" binding:"required,min=0,max=100"`
	TeamworkScore      float64 `json:"teamwork_score" binding:"required,min=0,max=100"`
	InitiativeScore    float64 `json:"initiative_score" binding:"required,min=0,max=100"`
	Feedback           string  `json:"feedback"`
}

// POST /api/evaluations
func CreateEvaluation(c *gin.Context) {
	supervisorID, _ := c.Get("userID")

	var input EvaluationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	overall := (input.TechnicalScore + input.CommunicationScore +
		input.PunctualityScore + input.TeamworkScore + input.InitiativeScore) / 5

	eval := models.Evaluation{
		StudentID:          input.StudentID,
		SupervisorID:       supervisorID.(uint),
		Period:             input.Period,
		TechnicalScore:     input.TechnicalScore,
		CommunicationScore: input.CommunicationScore,
		PunctualityScore:   input.PunctualityScore,
		TeamworkScore:      input.TeamworkScore,
		InitiativeScore:    input.InitiativeScore,
		OverallScore:       overall,
		Feedback:           input.Feedback,
	}

	config.DB.Create(&eval)
	c.JSON(http.StatusCreated, gin.H{"message": "Evaluation submitted", "evaluation": eval})
}

// GET /api/evaluations/me
func GetMyEvaluations(c *gin.Context) {
	userID, _ := c.Get("userID")
	var evals []models.Evaluation
	config.DB.Preload("Supervisor").Where("student_id = ?", userID).Order("created_at desc").Find(&evals)
	c.JSON(http.StatusOK, evals)
}

// GET /api/evaluations/:student_id
func GetStudentEvaluations(c *gin.Context) {
	studentID := c.Param("student_id")
	var evals []models.Evaluation
	config.DB.Preload("Supervisor").Where("student_id = ?", studentID).Order("created_at desc").Find(&evals)
	c.JSON(http.StatusOK, evals)
}
