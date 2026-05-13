package models

import (
	"time"

	"gorm.io/gorm"
)

// ─── Department ─────────────────────────────────────────
type Department struct {
	gorm.Model
	Name         string `gorm:"uniqueIndex;not null" json:"name"` // e.g. "IT Department"
	Code         string `gorm:"uniqueIndex;not null" json:"code"` // e.g. "IT", "BSBA", "CRIM"
	Description  string `json:"description"`
	Status       string `gorm:"type:varchar(20);default:'active'" json:"status"` // active / inactive
	ProfileImage string `json:"profile_image"`
}

// ─── User ───────────────────────────────────────────────
type User struct {
	gorm.Model
	Name         string      `gorm:"not null" json:"name"`
	Email        string      `gorm:"uniqueIndex;not null" json:"email"`
	Password     string      `gorm:"not null" json:"-"`
	Role         string      `gorm:"type:varchar(20);not null" json:"role"`
	Status       string      `gorm:"type:varchar(20);default:'pending'" json:"status"`
	ProfilePhoto string      `json:"profile_photo"`
	DepartmentID *uint       `json:"department_id"`                                       // nullable — existing users unaffected
	Department   *Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"` // eager-loadable
}

// ─── Company ────────────────────────────────────────────
type Company struct {
	gorm.Model
	Name          string `gorm:"not null" json:"name"`
	Address       string `json:"address"`
	ContactPerson string `json:"contact_person"`
	ContactEmail  string `json:"contact_email"`
	ContactPhone  string `json:"contact_phone"`
	Status        string `gorm:"type:varchar(20);default:'active'" json:"status"`
}

// ─── OJT Assignment ─────────────────────────────────────
type OJTAssignment struct {
	gorm.Model
	StudentID     uint      `gorm:"not null" json:"student_id"`
	DepartmentID  uint      `json:"department_id"` // Added department reference
	CompanyName   string    `gorm:"not null" json:"company_name"`
	SupervisorID  uint      `json:"supervisor_id"`
	CoordinatorID uint      `json:"coordinator_id"`
	RequiredHours float64   `gorm:"default:600" json:"required_hours"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	Status        string    `gorm:"type:varchar(20);default:'active'" json:"status"`

	Student     User       `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Department  Department `gorm:"foreignKey:DepartmentID" json:"department,omitempty"`
	Supervisor  User       `gorm:"foreignKey:SupervisorID" json:"supervisor,omitempty"`
	Coordinator User       `gorm:"foreignKey:CoordinatorID" json:"coordinator,omitempty"`
}

// ─── Time Log ────────────────────────────────────────────
type TimeLog struct {
	gorm.Model
	StudentID         uint       `gorm:"not null" json:"student_id"`
	ClockIn           time.Time  `gorm:"not null" json:"clock_in"`
	ClockOut          *time.Time `json:"clock_out"`
	TotalHours        float64    `json:"total_hours"`
	Status            string     `gorm:"type:varchar(20);default:'pending'" json:"status"`
	Remarks           string     `json:"remarks"`
	ApprovedBy        *uint      `json:"approved_by"`
	ClockInPhoto      string     `json:"clock_in_photo"`
	ClockOutPhoto     string     `json:"clock_out_photo"`
	BreakStartedAt    *time.Time `json:"break_started_at"`
	TotalBreakMinutes int        `gorm:"default:0" json:"total_break_minutes"`

	Student User `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

// ─── Evaluation ──────────────────────────────────────────
type Evaluation struct {
	gorm.Model
	StudentID          uint    `gorm:"not null" json:"student_id"`
	SupervisorID       uint    `gorm:"not null" json:"supervisor_id"`
	Period             string  `gorm:"not null" json:"period"`
	TechnicalScore     float64 `json:"technical_score"`
	CommunicationScore float64 `json:"communication_score"`
	PunctualityScore   float64 `json:"punctuality_score"`
	TeamworkScore      float64 `json:"teamwork_score"`
	InitiativeScore    float64 `json:"initiative_score"`
	OverallScore       float64 `json:"overall_score"`
	Feedback           string  `json:"feedback"`

	Student    User `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Supervisor User `gorm:"foreignKey:SupervisorID" json:"supervisor,omitempty"`
}

// ─── Document ────────────────────────────────────────────
type Document struct {
	gorm.Model
	StudentID       uint   `gorm:"not null" json:"student_id"`
	Type            string `gorm:"not null" json:"type"` // MOA, Endorsement, Waiver, Insurance
	FileURL         string `gorm:"not null" json:"file_url"`
	Status          string `gorm:"type:varchar(20);default:'pending'" json:"status"`
	RejectionReason string `json:"rejection_reason"`

	Student User `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

// ─── Notification ────────────────────────────────────────
type Notification struct {
	gorm.Model
	UserID  uint   `gorm:"not null" json:"user_id"`
	Message string `gorm:"not null" json:"message"`
	IsRead  bool   `gorm:"default:false" json:"is_read"`
	Link    string `json:"link"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// ─── Journal ─────────────────────────────────────────────
type Journal struct {
	gorm.Model
	StudentID    uint      `gorm:"not null" json:"student_id"`
	SupervisorID uint      `gorm:"not null" json:"supervisor_id"`
	Date         time.Time `gorm:"not null" json:"date"` // Represents the week ending date or submission date
	Tasks        string    `gorm:"type:text;not null" json:"tasks"`
	Learnings    string    `gorm:"type:text;not null" json:"learnings"`
	Status       string    `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending, acknowledged
	Feedback     string    `gorm:"type:text" json:"feedback"`                        // Optional supervisor feedback

	Student    User `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Supervisor User `gorm:"foreignKey:SupervisorID" json:"supervisor,omitempty"`
}

// ─── Announcement ─────────────────────────────────────────
type Announcement struct {
	gorm.Model
	Title    string `gorm:"not null" json:"title"`
	Content  string `gorm:"type:text;not null" json:"content"`
	AuthorID uint   `gorm:"not null" json:"author_id"`
	Target   string `gorm:"type:varchar(50);default:'all'" json:"target"` // all, students, supervisors

	Author User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}

// ─── Message ─────────────────────────────────────────────
type Message struct {
	gorm.Model
	SenderID   uint   `gorm:"not null" json:"sender_id"`
	ReceiverID uint   `gorm:"not null" json:"receiver_id"`
	Content    string `gorm:"type:text;not null" json:"content"`
	FileUrl    string `json:"file_url"`
	FileType   string `json:"file_type"` // image, document
	IsRead     bool   `gorm:"default:false" json:"is_read"`
	Reaction   string `json:"reaction"`

	Sender   User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver User `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
}
