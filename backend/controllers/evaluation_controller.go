package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// ─── Input Structs ────────────────────────────────────────────────────────────

type EvaluationInput struct {
	StudentID          uint    `json:"student_id"          binding:"required"`
	Period             string  `json:"period"              binding:"required"` // e.g. "Midterm", "Final", "Week 1"
	TechnicalScore     float64 `json:"technical_score"     binding:"required,min=0,max=100"`
	CommunicationScore float64 `json:"communication_score" binding:"required,min=0,max=100"`
	PunctualityScore   float64 `json:"punctuality_score"   binding:"required,min=0,max=100"`
	TeamworkScore      float64 `json:"teamwork_score"      binding:"required,min=0,max=100"`
	InitiativeScore    float64 `json:"initiative_score"    binding:"required,min=0,max=100"`
	Feedback           string  `json:"feedback"`
}

type UpdateEvaluationInput struct {
	TechnicalScore     *float64 `json:"technical_score"     binding:"omitempty,min=0,max=100"`
	CommunicationScore *float64 `json:"communication_score" binding:"omitempty,min=0,max=100"`
	PunctualityScore   *float64 `json:"punctuality_score"   binding:"omitempty,min=0,max=100"`
	TeamworkScore      *float64 `json:"teamwork_score"      binding:"omitempty,min=0,max=100"`
	InitiativeScore    *float64 `json:"initiative_score"    binding:"omitempty,min=0,max=100"`
	Feedback           *string  `json:"feedback"`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// computeOverall calculates the average of the 5 criteria, rounded to 2 decimals.
func computeOverall(tech, comm, punct, team, init float64) float64 {
	avg := (tech + comm + punct + team + init) / 5
	return math.Round(avg*100) / 100
}

// gradeLabel converts a numeric score to a descriptive grade.
func gradeLabel(score float64) string {
	switch {
	case score >= 90:
		return "Outstanding"
	case score >= 80:
		return "Very Satisfactory"
	case score >= 70:
		return "Satisfactory"
	case score >= 60:
		return "Fairly Satisfactory"
	default:
		return "Needs Improvement"
	}
}

// ─── POST /api/evaluations ────────────────────────────────────────────────────
// Supervisor submits a performance evaluation for a student.
// overall_score is auto-calculated as the average of all 5 criteria.

func CreateEvaluation(c *gin.Context) {
	supervisorID, _ := c.Get("userID")

	var input EvaluationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify the student exists and has the correct role
	var student models.User
	if result := config.DB.Where("id = ? AND role = 'student'", input.StudentID).First(&student); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// Prevent duplicate evaluation for the same student + period by the same supervisor
	var existing models.Evaluation
	if result := config.DB.Where(
		"student_id = ? AND supervisor_id = ? AND period = ?",
		input.StudentID, supervisorID, input.Period,
	).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error":         "You have already submitted an evaluation for this student in this period",
			"evaluation_id": existing.ID,
		})
		return
	}

	overall := computeOverall(
		input.TechnicalScore,
		input.CommunicationScore,
		input.PunctualityScore,
		input.TeamworkScore,
		input.InitiativeScore,
	)

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

	if result := config.DB.Create(&eval); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save evaluation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Evaluation submitted successfully",
		"evaluation": gin.H{
			"id":                  eval.ID,
			"student_id":          eval.StudentID,
			"student_name":        student.Name,
			"supervisor_id":       eval.SupervisorID,
			"period":              eval.Period,
			"technical_score":     eval.TechnicalScore,
			"communication_score": eval.CommunicationScore,
			"punctuality_score":   eval.PunctualityScore,
			"teamwork_score":      eval.TeamworkScore,
			"initiative_score":    eval.InitiativeScore,
			"overall_score":       eval.OverallScore,
			"grade":               gradeLabel(eval.OverallScore),
			"feedback":            eval.Feedback,
			"created_at":          eval.CreatedAt,
		},
	})
}

// ─── GET /api/evaluations/me ──────────────────────────────────────────────────
// Student: view all their own evaluations with supervisor info.

func GetMyEvaluations(c *gin.Context) {
	userID, _ := c.Get("userID")

	var evals []models.Evaluation
	config.DB.
		Preload("Supervisor").
		Where("student_id = ?", userID).
		Order("created_at desc").
		Find(&evals)

	// Build enriched response
	type EvalResponse struct {
		ID                 uint    `json:"id"`
		Period             string  `json:"period"`
		SupervisorName     string  `json:"supervisor_name"`
		TechnicalScore     float64 `json:"technical_score"`
		CommunicationScore float64 `json:"communication_score"`
		PunctualityScore   float64 `json:"punctuality_score"`
		TeamworkScore      float64 `json:"teamwork_score"`
		InitiativeScore    float64 `json:"initiative_score"`
		OverallScore       float64 `json:"overall_score"`
		Grade              string  `json:"grade"`
		Feedback           string  `json:"feedback"`
		CreatedAt          string  `json:"created_at"`
	}

	var result []EvalResponse
	for _, e := range evals {
		result = append(result, EvalResponse{
			ID:                 e.ID,
			Period:             e.Period,
			SupervisorName:     e.Supervisor.Name,
			TechnicalScore:     e.TechnicalScore,
			CommunicationScore: e.CommunicationScore,
			PunctualityScore:   e.PunctualityScore,
			TeamworkScore:      e.TeamworkScore,
			InitiativeScore:    e.InitiativeScore,
			OverallScore:       e.OverallScore,
			Grade:              gradeLabel(e.OverallScore),
			Feedback:           e.Feedback,
			CreatedAt:          e.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	if result == nil {
		result = []EvalResponse{}
	}

	c.JSON(http.StatusOK, gin.H{
		"total":       len(result),
		"evaluations": result,
	})
}

// ─── GET /api/evaluations/:student_id ─────────────────────────────────────────
// Supervisor / Coordinator / Faculty: view all evaluations for a student,
// including per-criteria averages and overall grade summary.

func GetStudentEvaluations(c *gin.Context) {
	studentID := c.Param("student_id")
	periodFilter := c.Query("period") // ?period=Midterm

	// Verify student exists
	var student models.User
	if result := config.DB.Where("id = ? AND role = 'student'", studentID).First(&student); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	query := config.DB.Preload("Supervisor").
		Where("student_id = ?", studentID).
		Order("created_at desc")

	if periodFilter != "" {
		query = query.Where("period = ?", periodFilter)
	}

	var evals []models.Evaluation
	query.Find(&evals)

	if len(evals) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"student":     gin.H{"id": student.ID, "name": student.Name, "email": student.Email},
			"summary":     nil,
			"evaluations": []interface{}{},
		})
		return
	}

	// Compute aggregated averages across all evaluations
	var sumTech, sumComm, sumPunct, sumTeam, sumInit, sumOverall float64
	for _, e := range evals {
		sumTech += e.TechnicalScore
		sumComm += e.CommunicationScore
		sumPunct += e.PunctualityScore
		sumTeam += e.TeamworkScore
		sumInit += e.InitiativeScore
		sumOverall += e.OverallScore
	}
	n := float64(len(evals))
	round := func(v float64) float64 { return math.Round(v/n*100) / 100 }

	avgOverall := round(sumOverall)

	c.JSON(http.StatusOK, gin.H{
		"student": gin.H{
			"id":    student.ID,
			"name":  student.Name,
			"email": student.Email,
		},
		"summary": gin.H{
			"total_evaluations":       len(evals),
			"avg_technical_score":     round(sumTech),
			"avg_communication_score": round(sumComm),
			"avg_punctuality_score":   round(sumPunct),
			"avg_teamwork_score":      round(sumTeam),
			"avg_initiative_score":    round(sumInit),
			"avg_overall_score":       avgOverall,
			"grade":                   gradeLabel(avgOverall),
		},
		"evaluations": evals,
	})
}

// ─── GET /api/evaluations/:student_id/latest ──────────────────────────────────
// Returns only the most recent evaluation for a student.

func GetLatestEvaluation(c *gin.Context) {
	studentID := c.Param("student_id")

	var student models.User
	if result := config.DB.Where("id = ? AND role = 'student'", studentID).First(&student); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	var eval models.Evaluation
	if result := config.DB.Preload("Supervisor").
		Where("student_id = ?", studentID).
		Order("created_at desc").
		First(&eval); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No evaluations found for this student"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"evaluation": gin.H{
			"id":                  eval.ID,
			"period":              eval.Period,
			"supervisor_name":     eval.Supervisor.Name,
			"technical_score":     eval.TechnicalScore,
			"communication_score": eval.CommunicationScore,
			"punctuality_score":   eval.PunctualityScore,
			"teamwork_score":      eval.TeamworkScore,
			"initiative_score":    eval.InitiativeScore,
			"overall_score":       eval.OverallScore,
			"grade":               gradeLabel(eval.OverallScore),
			"feedback":            eval.Feedback,
			"created_at":          eval.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}
