package controllers

import (
	"fmt"
	"math"
	"net/http"
	"ojt-system/config"
	"ojt-system/models"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
)

// ─── Data Structures ─────────────────────────────────────────────────────────

type WeeklyBreakdown struct {
	WeekLabel  string
	ClockIns   int
	TotalHours float64
	Status     string // all approved / some pending / all rejected
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func weekLabel(t time.Time) string {
	year, week := t.ISOWeek()
	return fmt.Sprintf("Week %02d, %d", week, year)
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

// ─── GET /api/reports/:student_id/pdf ────────────────────────────────────────
// Generates and streams a formatted PDF report for a student.
// Protected: supervisor, coordinator, faculty roles only.

func GenerateStudentReport(c *gin.Context) {
	studentID := c.Param("student_id")

	// ── 1. Fetch student ──────────────────────────────────────────────────────
	var student models.User
	if result := config.DB.Where("id = ? AND role = 'student'", studentID).First(&student); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	// ── 2. Fetch OJT assignment ───────────────────────────────────────────────
	var assignment models.OJTAssignment
	config.DB.Preload("Supervisor").Preload("Coordinator").
		Where("student_id = ?", studentID).First(&assignment)

	requiredHours := 600.0
	if assignment.RequiredHours > 0 {
		requiredHours = assignment.RequiredHours
	}

	// ── 3. Fetch all time logs ────────────────────────────────────────────────
	var timeLogs []models.TimeLog
	config.DB.Where("student_id = ?", studentID).Order("clock_in asc").Find(&timeLogs)

	var approvedHours, pendingHours float64
	weekMap := make(map[string]*WeeklyBreakdown)
	weekOrder := []string{}

	for _, log := range timeLogs {
		label := weekLabel(log.ClockIn)
		if _, exists := weekMap[label]; !exists {
			weekMap[label] = &WeeklyBreakdown{WeekLabel: label}
			weekOrder = append(weekOrder, label)
		}
		weekMap[label].ClockIns++
		weekMap[label].TotalHours += log.TotalHours

		if log.Status == "approved" {
			approvedHours += log.TotalHours
		} else if log.Status == "pending" {
			pendingHours += log.TotalHours
		}
	}
	approvedHours = round2(approvedHours)
	pendingHours = round2(pendingHours)

	remaining := round2(requiredHours - approvedHours)
	if remaining < 0 {
		remaining = 0
	}
	progressPct := round2((approvedHours / requiredHours) * 100)
	if progressPct > 100 {
		progressPct = 100
	}

	// Sort weekly breakdown chronologically
	sort.Strings(weekOrder)
	var weeks []WeeklyBreakdown
	for _, label := range weekOrder {
		w := *weekMap[label]
		w.TotalHours = round2(w.TotalHours)
		weeks = append(weeks, w)
	}

	// ── 4. Fetch evaluations ──────────────────────────────────────────────────
	var evaluations []models.Evaluation
	config.DB.Preload("Supervisor").
		Where("student_id = ?", studentID).
		Order("created_at asc").
		Find(&evaluations)

	// ── 5. Build PDF ──────────────────────────────────────────────────────────
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	pageW, _ := pdf.GetPageSize()
	contentW := pageW - 30 // 15mm margin each side

	// ── Colors ────────────────────────────────────────────────────────────────
	type RGB struct{ R, G, B int }
	primary := RGB{30, 64, 175}    // indigo-800
	secondary := RGB{99, 102, 241} // indigo-500
	success := RGB{22, 163, 74}    // green-600
	warning := RGB{202, 138, 4}    // yellow-600
	textDark := RGB{17, 24, 39}    // gray-900
	textMid := RGB{75, 85, 99}     // gray-600
	bgLight := RGB{239, 246, 255}  // blue-50
	border := RGB{209, 213, 219}   // gray-300
	white := RGB{255, 255, 255}

	setFillRGB := func(rgb RGB) { pdf.SetFillColor(rgb.R, rgb.G, rgb.B) }
	setTextRGB := func(rgb RGB) { pdf.SetTextColor(rgb.R, rgb.G, rgb.B) }
	setDrawRGB := func(rgb RGB) { pdf.SetDrawColor(rgb.R, rgb.G, rgb.B) }

	// ── Header Banner ─────────────────────────────────────────────────────────
	setFillRGB(primary)
	pdf.Rect(0, 0, pageW, 40, "F")

	setTextRGB(white)
	pdf.SetFont("Helvetica", "B", 20)
	pdf.SetXY(15, 8)
	pdf.CellFormat(contentW, 10, "OJT PERFORMANCE MONITORING SYSTEM", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "", 10)
	pdf.SetX(15)
	pdf.CellFormat(contentW, 7, "Official Student Performance Report", "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetX(15)
	pdf.CellFormat(contentW, 6, fmt.Sprintf("Generated: %s", time.Now().Format("January 02, 2006  3:04 PM")), "", 1, "C", false, 0, "")

	pdf.SetY(45)

	// ── Section Helper ────────────────────────────────────────────────────────
	sectionHeader := func(title string) {
		pdf.Ln(4)
		setFillRGB(bgLight)
		setDrawRGB(secondary)
		setTextRGB(primary)
		pdf.SetFont("Helvetica", "B", 11)
		pdf.SetLineWidth(0.5)
		pdf.CellFormat(contentW, 8, "  "+title, "LB", 1, "L", true, 0, "")
		pdf.Ln(2)
	}

	// ── Key-Value Row Helper ──────────────────────────────────────────────────
	kvRow := func(label, value string, labelW float64) {
		setTextRGB(textMid)
		pdf.SetFont("Helvetica", "", 9)
		pdf.CellFormat(labelW, 7, label, "", 0, "L", false, 0, "")
		setTextRGB(textDark)
		pdf.SetFont("Helvetica", "B", 9)
		pdf.CellFormat(contentW-labelW, 7, value, "", 1, "L", false, 0, "")
	}

	// ── Section 1: Student Information ────────────────────────────────────────
	sectionHeader("STUDENT INFORMATION")
	kvRow("Full Name:", student.Name, 45)
	kvRow("Email Address:", student.Email, 45)
	kvRow("Student ID:", fmt.Sprintf("#%d", student.ID), 45)

	// ── Section 2: OJT Assignment Details ─────────────────────────────────────
	sectionHeader("OJT ASSIGNMENT DETAILS")
	if assignment.ID != 0 {
		kvRow("Company / Organization:", assignment.CompanyName, 55)
		kvRow("OJT Status:", assignment.Status, 55)
		if !assignment.StartDate.IsZero() {
			kvRow("Start Date:", assignment.StartDate.Format("January 02, 2006"), 55)
		}
		if !assignment.EndDate.IsZero() {
			kvRow("End Date:", assignment.EndDate.Format("January 02, 2006"), 55)
		}
		if assignment.Supervisor.ID != 0 {
			kvRow("Industry Supervisor:", assignment.Supervisor.Name, 55)
		}
		if assignment.Coordinator.ID != 0 {
			kvRow("OJT Coordinator:", assignment.Coordinator.Name, 55)
		}
	} else {
		setTextRGB(textMid)
		pdf.SetFont("Helvetica", "I", 9)
		pdf.CellFormat(contentW, 7, "No OJT assignment found.", "", 1, "L", false, 0, "")
	}

	// ── Section 3: Hours Summary ───────────────────────────────────────────────
	sectionHeader("TIME & HOURS SUMMARY")

	// Summary cards (3 columns)
	cardW := (contentW - 6) / 3
	cardData := []struct {
		label string
		value string
		color RGB
	}{
		{"Required Hours", fmt.Sprintf("%.0fh", requiredHours), primary},
		{"Approved Hours", fmt.Sprintf("%.2fh", approvedHours), success},
		{"Remaining Hours", fmt.Sprintf("%.2fh", remaining), warning},
	}

	startX := pdf.GetX()
	startY := pdf.GetY()
	for i, card := range cardData {
		x := startX + float64(i)*(cardW+3)
		setFillRGB(card.color)
		setDrawRGB(border)
		pdf.SetLineWidth(0.3)
		pdf.RoundedRect(x, startY, cardW, 20, 2, "1234", "FD")

		setTextRGB(white)
		pdf.SetFont("Helvetica", "B", 14)
		pdf.SetXY(x, startY+3)
		pdf.CellFormat(cardW, 8, card.value, "", 1, "C", false, 0, "")

		pdf.SetFont("Helvetica", "", 7)
		pdf.SetX(x)
		pdf.CellFormat(cardW, 5, card.label, "", 1, "C", false, 0, "")
	}

	pdf.SetY(startY + 24)

	// Progress bar
	barW := contentW
	barH := 6.0
	barY := pdf.GetY()
	setTextRGB(textMid)
	pdf.SetFont("Helvetica", "", 8)
	pdf.CellFormat(contentW, 5, fmt.Sprintf("Completion Progress: %.2f%%", progressPct), "", 1, "L", false, 0, "")

	barY = pdf.GetY()
	setFillRGB(border)
	setDrawRGB(border)
	pdf.Rect(15, barY, barW, barH, "F")

	fillW := (progressPct / 100) * barW
	if progressPct >= 100 {
		setFillRGB(success)
	} else if progressPct >= 50 {
		setFillRGB(secondary)
	} else {
		setFillRGB(warning)
	}
	pdf.Rect(15, barY, fillW, barH, "F")

	setTextRGB(white)
	pdf.SetFont("Helvetica", "B", 7)
	if fillW > 15 {
		pdf.SetXY(15, barY)
		pdf.CellFormat(fillW, barH, fmt.Sprintf("  %.2f%%", progressPct), "", 0, "L", false, 0, "")
	}
	pdf.SetY(barY + barH + 3)

	// ── Section 4: Weekly Breakdown Table ─────────────────────────────────────
	sectionHeader("WEEKLY HOURS BREAKDOWN")

	if len(weeks) == 0 {
		setTextRGB(textMid)
		pdf.SetFont("Helvetica", "I", 9)
		pdf.CellFormat(contentW, 7, "No time logs recorded yet.", "", 1, "L", false, 0, "")
	} else {
		// Table header
		cols := []struct {
			label string
			w     float64
		}{
			{"Week", 60},
			{"Sessions", 35},
			{"Total Hours", 45},
			{"Pending Hrs", contentW - 140},
		}

		setFillRGB(primary)
		setTextRGB(white)
		setDrawRGB(border)
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetLineWidth(0.3)
		for _, col := range cols {
			pdf.CellFormat(col.w, 7, col.label, "1", 0, "C", true, 0, "")
		}
		pdf.Ln(-1)

		// Table rows
		for i, w := range weeks {
			if i%2 == 0 {
				setFillRGB(RGB{248, 250, 252})
			} else {
				setFillRGB(white)
			}
			setTextRGB(textDark)
			pdf.SetFont("Helvetica", "", 9)
			pdf.CellFormat(cols[0].w, 6, w.WeekLabel, "1", 0, "L", true, 0, "")
			pdf.CellFormat(cols[1].w, 6, fmt.Sprintf("%d", w.ClockIns), "1", 0, "C", true, 0, "")
			pdf.CellFormat(cols[2].w, 6, fmt.Sprintf("%.2f hrs", w.TotalHours), "1", 0, "C", true, 0, "")
			pdf.CellFormat(cols[3].w, 6, "—", "1", 0, "C", true, 0, "")
			pdf.Ln(-1)
		}
	}

	// ── Section 5: Evaluation Scores ──────────────────────────────────────────
	pdf.AddPage()

	// Re-draw small header stripe on page 2
	setFillRGB(primary)
	pdf.Rect(0, 0, pageW, 12, "F")
	setTextRGB(white)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetXY(15, 2)
	pdf.CellFormat(contentW, 8, fmt.Sprintf("OJT Report  —  %s  (continued)", student.Name), "", 1, "C", false, 0, "")
	pdf.SetY(18)

	sectionHeader("PERFORMANCE EVALUATIONS")

	if len(evaluations) == 0 {
		setTextRGB(textMid)
		pdf.SetFont("Helvetica", "I", 9)
		pdf.CellFormat(contentW, 7, "No evaluations recorded yet.", "", 1, "L", false, 0, "")
	} else {
		type jobFactor struct {
			label string
			max   float64
			value float64
		}

		var sumOverall float64
		for i, ev := range evaluations {
			sumOverall += ev.OverallScore

			// Evaluation header row
			if i > 0 {
				pdf.Ln(3)
			}
			setFillRGB(primary)
			setTextRGB(white)
			pdf.SetFont("Helvetica", "B", 8)
			pdf.CellFormat(contentW, 7, fmt.Sprintf("  OJT Completion Evaluation  |  Supervisor: %s", ev.Supervisor.Name), "1", 1, "L", true, 0, "")

			// 9 Job Factors — 2-column layout
			factors := []jobFactor{
				{"1. Quality of Work (Accuracy & Neatness)", 20, ev.QualityWorkAccuracy},
				{"2. Quality of Work (Complete in Allotted Time)", 20, ev.QualityWorkTimeliness},
				{"3. Dependability, Reliability & Resourcefulness", 10, ev.Dependability},
				{"4. Attendance & Punctuality", 10, ev.Attendance},
				{"5. Cooperation", 10, ev.Cooperation},
				{"6. Observance of Company Rules & Regulations", 10, ev.CompanyRulesObservance},
				{"7. Personality", 5, ev.Personality},
				{"8. Safety and Housekeeping", 10, ev.SafetyHousekeeping},
				{"9. Proper Use of Tools / Equipment", 5, ev.ToolsEquipment},
			}

			half := contentW / 2
			pdf.SetFont("Helvetica", "", 7)
			for j := 0; j < len(factors); j += 2 {
				if j%2 == 0 {
					setFillRGB(RGB{248, 250, 252})
				} else {
					setFillRGB(white)
				}
				setTextRGB(textDark)
				f1 := factors[j]
				pdf.CellFormat(half*0.70, 6, f1.label, "1", 0, "L", true, 0, "")
				pdf.CellFormat(half*0.30, 6, fmt.Sprintf("%.1f / %.0f", f1.value, f1.max), "1", 0, "C", true, 0, "")
				if j+1 < len(factors) {
					f2 := factors[j+1]
					pdf.CellFormat(half*0.70, 6, f2.label, "1", 0, "L", true, 0, "")
					pdf.CellFormat(half*0.30, 6, fmt.Sprintf("%.1f / %.0f", f2.value, f2.max), "1", 0, "C", true, 0, "")
				} else {
					pdf.CellFormat(half, 6, "", "1", 0, "L", true, 0, "")
				}
				pdf.Ln(-1)
			}

			// Total Rating row
			grade := gradeLabel(ev.OverallScore)
			switch {
			case ev.OverallScore >= 90:
				setFillRGB(success)
			case ev.OverallScore >= 70:
				setFillRGB(secondary)
			default:
				setFillRGB(warning)
			}
			setTextRGB(white)
			pdf.SetFont("Helvetica", "B", 8)
			pdf.CellFormat(contentW*0.65, 7, "TOTAL RATING", "1", 0, "R", true, 0, "")
			pdf.CellFormat(contentW*0.20, 7, fmt.Sprintf("%.2f / 100", ev.OverallScore), "1", 0, "C", true, 0, "")
			pdf.CellFormat(contentW*0.15, 7, grade, "1", 0, "C", true, 0, "")
			pdf.Ln(-1)
		}

		// Average overall row
		avgOverall := round2(sumOverall / float64(len(evaluations)))
		setFillRGB(primary)
		setTextRGB(white)
		pdf.SetFont("Helvetica", "B", 8)
		pdf.Ln(3)
		pdf.CellFormat(contentW*0.65, 7, "AVERAGE OVERALL SCORE", "1", 0, "R", true, 0, "")
		pdf.CellFormat(contentW*0.20, 7, fmt.Sprintf("%.2f / 100", avgOverall), "1", 0, "C", true, 0, "")
		pdf.CellFormat(contentW*0.15, 7, gradeLabel(avgOverall), "1", 0, "C", true, 0, "")
		pdf.Ln(-1)
	}

	// Recommendation section
	if len(evaluations) > 0 {
		pdf.Ln(4)
		sectionHeader("RECOMMENDATION FOR THE TRAINEES GROWTH")
		for _, ev := range evaluations {
			if ev.Recommendation == "" {
				continue
			}
			setTextRGB(primary)
			pdf.SetFont("Helvetica", "B", 8)
			pdf.CellFormat(contentW, 6, fmt.Sprintf("[%s] — %s", ev.Period, ev.Supervisor.Name), "", 1, "L", false, 0, "")
			setTextRGB(textDark)
			pdf.SetFont("Helvetica", "", 8)
			pdf.MultiCell(contentW, 5, ev.Recommendation, "", "L", false)
			pdf.Ln(2)
		}
	}

	// ── Footer ────────────────────────────────────────────────────────────────
	pdf.SetFooterFunc(func() {
		setFillRGB(primary)
		pdf.Rect(0, 287, pageW, 10, "F")
		setTextRGB(white)
		pdf.SetFont("Helvetica", "", 7)
		pdf.SetY(289)
		pdf.SetX(15)
		pdf.CellFormat(contentW/2, 5, "OJT Performance Monitoring System  —  Confidential", "", 0, "L", false, 0, "")
		pdf.CellFormat(contentW/2, 5, fmt.Sprintf("Page %d", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	// ── 6. Stream PDF to client ───────────────────────────────────────────────
	filename := fmt.Sprintf("OJT_Report_%s_%s.pdf",
		student.Name,
		time.Now().Format("2006-01-02"),
	)

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Cache-Control", "no-cache")

	if err := pdf.Output(c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF: " + err.Error()})
		return
	}
}
