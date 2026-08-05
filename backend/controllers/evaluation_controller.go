package controllers

import (
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"

	"github.com/gin-gonic/gin"
)

// ─── Job Factor Max Ratings ───────────────────────────────────────────────────

const (
	maxQualityWorkAccuracy    = 20.0
	maxQualityWorkTimeliness  = 20.0
	maxDependability          = 10.0
	maxAttendance             = 10.0
	maxCooperation            = 10.0
	maxCompanyRulesObservance = 10.0
	maxPersonality            = 5.0
	maxSafetyHousekeeping     = 10.0
	maxToolsEquipment         = 5.0
)

// ─── Input Structs ────────────────────────────────────────────────────────────

// evaluationPeriod is the fixed period label used for all evaluations.
// There is only one evaluation per student, submitted after OJT completion.
const evaluationPeriod = "OJT Completion"

type EvaluationInput struct {
	StudentID              uint    `json:"student_id"               binding:"required"`
	QualityWorkAccuracy    float64 `json:"quality_work_accuracy"    binding:"required,min=0,max=20"`
	QualityWorkTimeliness  float64 `json:"quality_work_timeliness"  binding:"required,min=0,max=20"`
	Dependability          float64 `json:"dependability"            binding:"required,min=0,max=10"`
	Attendance             float64 `json:"attendance"               binding:"required,min=0,max=10"`
	Cooperation            float64 `json:"cooperation"              binding:"required,min=0,max=10"`
	CompanyRulesObservance float64 `json:"company_rules_observance" binding:"required,min=0,max=10"`
	Personality            float64 `json:"personality"              binding:"required,min=0,max=5"`
	SafetyHousekeeping     float64 `json:"safety_housekeeping"      binding:"required,min=0,max=10"`
	ToolsEquipment         float64 `json:"tools_equipment"          binding:"required,min=0,max=5"`
	Recommendation         string  `json:"recommendation"`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// computeOverall sums all 9 weighted job factor scores.
// Since each score is already rated against its own max percentage,
// the sum directly equals the total rating (max 100).
func computeOverall(qwa, qwt, dep, att, coop, cro, per, sh, te float64) float64 {
	total := qwa + qwt + dep + att + coop + cro + per + sh + te
	return math.Round(total*100) / 100
}

// gradeLabel converts a total score to a descriptive grade label.
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

// evalResponse builds a consistent evaluation response object.
func evalResponse(eval models.Evaluation, studentName string) gin.H {
	return gin.H{
		"id":                      eval.ID,
		"student_id":              eval.StudentID,
		"student_name":            studentName,
		"supervisor_id":           eval.SupervisorID,
		"period":                  eval.Period,
		"quality_work_accuracy":   eval.QualityWorkAccuracy,
		"quality_work_timeliness": eval.QualityWorkTimeliness,
		"dependability":           eval.Dependability,
		"attendance":              eval.Attendance,
		"cooperation":             eval.Cooperation,
		"company_rules_observance": eval.CompanyRulesObservance,
		"personality":             eval.Personality,
		"safety_housekeeping":     eval.SafetyHousekeeping,
		"tools_equipment":         eval.ToolsEquipment,
		"overall_score":           eval.OverallScore,
		"grade":                   gradeLabel(eval.OverallScore),
		"recommendation":          eval.Recommendation,
		"created_at":              eval.CreatedAt,
	}
}

// ─── POST /api/evaluations ────────────────────────────────────────────────────
// Supervisor submits a performance evaluation for an assigned student.
// Guard 1: Supervisor must be assigned to the student (via OJTAssignment).
// Guard 2: Student must have fulfilled their required OJT hours.

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

	// ── Guard 1: Assignment Ownership ────────────────────────────────────────
	// The supervisor must be assigned to this student via an active OJTAssignment.
	var assignment models.OJTAssignment
	if result := config.DB.Where(
		"student_id = ? AND supervisor_id = ? AND status = 'active'",
		input.StudentID, supervisorID,
	).First(&assignment); result.Error != nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "You are not assigned as the supervisor for this student",
		})
		return
	}

	// ── Guard 2: Hours Completion Gate ───────────────────────────────────────
	// The student must have accumulated approved hours >= required hours
	// before a supervisor is allowed to submit an evaluation.
	var approvedLogs []models.TimeLog
	config.DB.Where("student_id = ? AND status = 'approved'", input.StudentID).Find(&approvedLogs)
	var approvedHours float64
	for _, l := range approvedLogs {
		approvedHours += l.TotalHours
	}
	approvedHours = math.Round(approvedHours*100) / 100

	requiredHours := 600.0
	if assignment.RequiredHours > 0 {
		requiredHours = assignment.RequiredHours
	}

	if approvedHours < requiredHours {
		c.JSON(http.StatusForbidden, gin.H{
			"error":           "Student has not yet completed their required OJT hours",
			"approved_hours":  approvedHours,
			"required_hours":  requiredHours,
			"remaining_hours": math.Round((requiredHours-approvedHours)*100) / 100,
		})
		return
	}

	// ── Prevent duplicate: only one evaluation per student is allowed
	var existing models.Evaluation
	if result := config.DB.Where(
		"student_id = ?", input.StudentID,
	).First(&existing); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error":         "An evaluation has already been submitted for this student",
			"evaluation_id": existing.ID,
		})
		return
	}

	overall := computeOverall(
		input.QualityWorkAccuracy,
		input.QualityWorkTimeliness,
		input.Dependability,
		input.Attendance,
		input.Cooperation,
		input.CompanyRulesObservance,
		input.Personality,
		input.SafetyHousekeeping,
		input.ToolsEquipment,
	)

	eval := models.Evaluation{
		StudentID:              input.StudentID,
		SupervisorID:           supervisorID.(uint),
		Period:                 evaluationPeriod, // Fixed: one evaluation after OJT completion
		QualityWorkAccuracy:    input.QualityWorkAccuracy,
		QualityWorkTimeliness:  input.QualityWorkTimeliness,
		Dependability:          input.Dependability,
		Attendance:             input.Attendance,
		Cooperation:            input.Cooperation,
		CompanyRulesObservance: input.CompanyRulesObservance,
		Personality:            input.Personality,
		SafetyHousekeeping:     input.SafetyHousekeeping,
		ToolsEquipment:         input.ToolsEquipment,
		OverallScore:           overall,
		Recommendation:         input.Recommendation,
	}

	if result := config.DB.Create(&eval); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save evaluation"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Evaluation submitted successfully",
		"evaluation": evalResponse(eval, student.Name),
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

	type EvalResponse struct {
		ID                     uint    `json:"id"`
		Period                 string  `json:"period"`
		SupervisorName         string  `json:"supervisor_name"`
		QualityWorkAccuracy    float64 `json:"quality_work_accuracy"`
		QualityWorkTimeliness  float64 `json:"quality_work_timeliness"`
		Dependability          float64 `json:"dependability"`
		Attendance             float64 `json:"attendance"`
		Cooperation            float64 `json:"cooperation"`
		CompanyRulesObservance float64 `json:"company_rules_observance"`
		Personality            float64 `json:"personality"`
		SafetyHousekeeping     float64 `json:"safety_housekeeping"`
		ToolsEquipment         float64 `json:"tools_equipment"`
		OverallScore           float64 `json:"overall_score"`
		Grade                  string  `json:"grade"`
		Recommendation         string  `json:"recommendation"`
		CreatedAt              string  `json:"created_at"`
	}

	var result []EvalResponse
	for _, e := range evals {
		result = append(result, EvalResponse{
			ID:                     e.ID,
			Period:                 e.Period,
			SupervisorName:         e.Supervisor.Name,
			QualityWorkAccuracy:    e.QualityWorkAccuracy,
			QualityWorkTimeliness:  e.QualityWorkTimeliness,
			Dependability:          e.Dependability,
			Attendance:             e.Attendance,
			Cooperation:            e.Cooperation,
			CompanyRulesObservance: e.CompanyRulesObservance,
			Personality:            e.Personality,
			SafetyHousekeeping:     e.SafetyHousekeeping,
			ToolsEquipment:         e.ToolsEquipment,
			OverallScore:           e.OverallScore,
			Grade:                  gradeLabel(e.OverallScore),
			Recommendation:         e.Recommendation,
			CreatedAt:              e.CreatedAt.Format("2006-01-02 15:04:05"),
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
	periodFilter := c.Query("period") // ?period=Final

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
	var (
		sumQWA, sumQWT, sumDep, sumAtt float64
		sumCoop, sumCRO, sumPer        float64
		sumSH, sumTE, sumOverall       float64
	)
	for _, e := range evals {
		sumQWA += e.QualityWorkAccuracy
		sumQWT += e.QualityWorkTimeliness
		sumDep += e.Dependability
		sumAtt += e.Attendance
		sumCoop += e.Cooperation
		sumCRO += e.CompanyRulesObservance
		sumPer += e.Personality
		sumSH += e.SafetyHousekeeping
		sumTE += e.ToolsEquipment
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
			"total_evaluations":           len(evals),
			"avg_quality_work_accuracy":   round(sumQWA),
			"avg_quality_work_timeliness": round(sumQWT),
			"avg_dependability":           round(sumDep),
			"avg_attendance":              round(sumAtt),
			"avg_cooperation":             round(sumCoop),
			"avg_company_rules":           round(sumCRO),
			"avg_personality":             round(sumPer),
			"avg_safety_housekeeping":     round(sumSH),
			"avg_tools_equipment":         round(sumTE),
			"avg_overall_score":           avgOverall,
			"grade":                       gradeLabel(avgOverall),
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
			"id":                      eval.ID,
			"period":                  eval.Period,
			"supervisor_name":         eval.Supervisor.Name,
			"quality_work_accuracy":   eval.QualityWorkAccuracy,
			"quality_work_timeliness": eval.QualityWorkTimeliness,
			"dependability":           eval.Dependability,
			"attendance":              eval.Attendance,
			"cooperation":             eval.Cooperation,
			"company_rules_observance": eval.CompanyRulesObservance,
			"personality":             eval.Personality,
			"safety_housekeeping":     eval.SafetyHousekeeping,
			"tools_equipment":         eval.ToolsEquipment,
			"overall_score":           eval.OverallScore,
			"grade":                   gradeLabel(eval.OverallScore),
			"recommendation":          eval.Recommendation,
			"created_at":              eval.CreatedAt.Format("2006-01-02 15:04:05"),
		},
	})
}
