package routes

import (
	"ojt-system/controllers"
	"ojt-system/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")

	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "version": "v1.1"})
	})

	// ─── Public Routes ────────────────────────────────────────────────────────
	auth := api.Group("/auth")
	{
		auth.POST("/register", controllers.Register) // Create account + get token
		auth.POST("/login", controllers.Login)       // Login → get token
		auth.POST("/change-password",
			middleware.AuthMiddleware(),
			controllers.ChangePassword, // Change password (needs token)
		)
	}

	// ─── Protected Routes (require valid JWT) ─────────────────────────────────
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// ── Current User ──────────────────────────────────────────────────────
		protected.GET("me", controllers.GetMe)                // GET  /api/me
		protected.PUT("me", controllers.UpdateProfile)        // PUT  /api/me
		protected.POST("me/avatar", controllers.UploadAvatar) // POST /api/me/avatar

		// ── Time Logs ─────────────────────────────────────────────────────────
		timelogs := protected.Group("/timelogs")
		{
			// Student endpoints
			timelogs.POST("/", controllers.CreateTimeLog)          // POST   /api/timelogs        — manual entry (clock_in + optional clock_out)
			timelogs.POST("/clockin", controllers.ClockIn)         // POST   /api/timelogs/clockin — instant clock-in (now)
			timelogs.PATCH("/clockout", controllers.ClockOut)      // PATCH  /api/timelogs/clockout — instant clock-out (now)
			timelogs.PATCH("/break/start", controllers.StartBreak) // PATCH /api/timelogs/break/start
			timelogs.PATCH("/break/end", controllers.EndBreak)     // PATCH /api/timelogs/break/end
			timelogs.GET("/", controllers.GetMyTimeLogs)           // GET    /api/timelogs/?status=pending

			// Supervisor / Coordinator / Faculty endpoints
			timelogs.GET("/:student_id",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty", "admin"),
				controllers.GetStudentTimeLogs, // GET  /api/timelogs/:student_id?status=&date_from=&date_to=
			)
			timelogs.GET("/:student_id/summary",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty", "admin"),
				controllers.GetStudentSummary, // GET  /api/timelogs/:student_id/summary
			)
			timelogs.PATCH("/:id/approve",
				middleware.RoleMiddleware("supervisor", "coordinator", "admin"),
				controllers.ApproveTimeLog, // PATCH /api/timelogs/:id/approve
			)
			timelogs.PATCH("/:id/reject",
				middleware.RoleMiddleware("supervisor", "coordinator", "admin"),
				controllers.RejectTimeLog, // PATCH /api/timelogs/:id/reject
			)
		}

		// ── Evaluations ───────────────────────────────────────────────────────
		evaluations := protected.Group("/evaluations")
		{
			evaluations.POST("/",
				middleware.RoleMiddleware("supervisor"),
				controllers.CreateEvaluation, // POST /api/evaluations/
			)
			evaluations.GET("/me", controllers.GetMyEvaluations) // GET /api/evaluations/me
			evaluations.GET("/:student_id",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty", "admin"),
				controllers.GetStudentEvaluations, // GET /api/evaluations/:student_id?period=Midterm
			)
			evaluations.GET("/:student_id/latest",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty", "admin"),
				controllers.GetLatestEvaluation, // GET /api/evaluations/:student_id/latest
			)
		}

		// ── Reports ───────────────────────────────────────────────────────────
		reports := protected.Group("/reports")
		{
			reports.GET("/:student_id/pdf",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty", "admin"),
				controllers.GenerateStudentReport, // GET /api/reports/:student_id/pdf
			)
		}

		// ── Journals ──────────────────────────────────────────────────────────
		journals := protected.Group("/journals")
		{
			// Student endpoints
			journals.GET("/me", controllers.GetStudentJournals)
			journals.POST("/", controllers.CreateJournal)

			// Supervisor endpoints
			journals.GET("/supervisor",
				middleware.RoleMiddleware("supervisor", "coordinator", "admin"),
				controllers.GetSupervisorJournals,
			)
			journals.PATCH("/:id/review",
				middleware.RoleMiddleware("supervisor"),
				controllers.ReviewJournal,
			)

			// Coordinator/Faculty endpoints
			journals.GET("/all",
				middleware.RoleMiddleware("coordinator", "admin", "faculty"),
				controllers.GetCoordinatorJournals,
			)
		}

		// ── Announcements ───────────────────────────────────────────────────────
		announcements := protected.Group("/announcements")
		{
			announcements.GET("/", controllers.GetAnnouncements)
			announcements.POST("/",
				middleware.RoleMiddleware("coordinator", "supervisor", "faculty", "admin"),
				controllers.CreateAnnouncement,
			)
			announcements.DELETE("/:id",
				middleware.RoleMiddleware("coordinator", "supervisor", "admin"),
				controllers.DeleteAnnouncement,
			)
		}

		// ── Documents ─────────────────────────────────────────────────────────
		protected.POST("/documents", controllers.UploadDocument) // POST /api/documents
		protected.GET("/documents", controllers.GetMyDocuments)  // GET  /api/documents

		// ── Notifications ─────────────────────────────────────────────────────
		notifications := protected.Group("/notifications")
		{
			notifications.GET("/", controllers.GetMyNotifications)                       // GET   /api/notifications
			notifications.PATCH("/:id/read", controllers.MarkNotificationRead)           // PATCH /api/notifications/:id/read
			notifications.PATCH("/read-all", controllers.MarkAllNotificationsReadGlobal) // PATCH /api/notifications/read-all
		}

		// ── Direct Messaging ──────────────────────────────────────────────────
		messages := protected.Group("/messages")
		{
			messages.GET("/contacts", controllers.GetContacts)
			messages.GET("/conversation/:contactId", controllers.GetConversation)
			messages.POST("/", controllers.SendMessage)
			messages.GET("/unread", controllers.GetUnreadCount)
			messages.PUT("/:id/react", controllers.ReactToMessage)
			messages.GET("/ws", controllers.HandleWS)
		}

		// ── Supervisor ────────────────────────────────────────────────────────
		supervisor := protected.Group("/supervisor")
		supervisor.Use(middleware.RoleMiddleware("supervisor"))
		{
			supervisor.GET("/students", controllers.GetSupervisorStudents)                    // GET   /api/supervisor/students
			supervisor.GET("/notifications", controllers.GetSupervisorNotifications)          // GET   /api/supervisor/notifications
			supervisor.PATCH("/notifications/read-all", controllers.MarkAllNotificationsRead) // PATCH /api/supervisor/notifications/read-all
			supervisor.GET("/activity", controllers.GetSupervisorActivity)                    // GET   /api/supervisor/activity
		}

		// ── Coordinator ───────────────────────────────────────────────────────
		coordinator := protected.Group("/coordinator")
		coordinator.Use(middleware.RoleMiddleware("coordinator", "admin"))
		{
			coordinator.GET("/students", controllers.GetCoordinatorStudents) // GET /api/coordinator/students
			coordinator.GET("/stats", controllers.GetCoordinatorStats)       // GET /api/coordinator/stats

			// User Management
			coordinator.GET("/users/pending", controllers.GetPendingUsers)   // GET /api/coordinator/users/pending
			coordinator.GET("/faculty", controllers.GetCoordinatorFaculty)   // GET /api/coordinator/faculty
			coordinator.PATCH("/users/:id/approve", controllers.ApproveUser) // PATCH /api/coordinator/users/:id/approve
			coordinator.PATCH("/users/:id/reject", controllers.RejectUser)   // PATCH /api/coordinator/users/:id/reject
			coordinator.PATCH("/users/:id", controllers.UpdateUser)          // PATCH /api/coordinator/users/:id — general update

			// Document Approvals
			coordinator.GET("/documents", controllers.GetAllDocuments)               // GET /api/coordinator/documents
			coordinator.PATCH("/documents/:id/approve", controllers.ApproveDocument) // PATCH /api/coordinator/documents/:id/approve
			coordinator.PATCH("/documents/:id/reject", controllers.RejectDocument)   // PATCH /api/coordinator/documents/:id/reject
		}

		// ── Faculty ───────────────────────────────────────────────────────────
		faculty := protected.Group("/faculty")
		faculty.Use(middleware.RoleMiddleware("faculty"))
		{
			faculty.GET("/students", controllers.GetFacultyStudents) // GET /api/faculty/students — scoped to faculty's department
			faculty.GET("/stats", controllers.GetCoordinatorStats)   // GET /api/faculty/stats
		}

		// ── Assignments ───────────────────────────────────────────────────────
		assignments := protected.Group("/assignments")
		assignments.Use(middleware.RoleMiddleware("coordinator", "admin")) // Only coordinators manage assignments
		{
			assignments.GET("/", controllers.GetAssignments)              // GET    /api/assignments
			assignments.GET("/options", controllers.GetAssignmentOptions) // GET    /api/assignments/options
			assignments.POST("/", controllers.CreateAssignment)           // POST   /api/assignments
			assignments.PATCH("/:id", controllers.UpdateAssignment)       // PATCH  /api/assignments/:id
			assignments.DELETE("/:id", controllers.DeleteAssignment)      // DELETE /api/assignments/:id
		}

		// ── Companies ─────────────────────────────────────────────────────────
		companies := protected.Group("/companies")
		companies.Use(middleware.RoleMiddleware("coordinator", "admin", "faculty")) // Faculty can list companies
		{
			companies.GET("/", controllers.GetCompanies)        // GET    /api/companies
			companies.POST("/", controllers.CreateCompany)      // POST   /api/companies
			companies.PATCH("/:id", controllers.UpdateCompany)  // PATCH  /api/companies/:id
			companies.DELETE("/:id", controllers.DeleteCompany) // DELETE /api/companies/:id
		}
	}

	// ── Departments ────────────────────────────────────────────────────────
	depts := api.Group("/departments")
	{
		depts.GET("/", controllers.GetDepartments) // Public for registration
		depts.GET("/:id/members",
			middleware.AuthMiddleware(),
			middleware.RoleMiddleware("coordinator", "admin", "faculty"),
			controllers.GetDepartmentMembers,
		)
		depts.POST("/",
			middleware.AuthMiddleware(),
			middleware.RoleMiddleware("coordinator", "admin"),
			controllers.CreateDepartment,
		)
		depts.PATCH("/:id",
			middleware.AuthMiddleware(),
			middleware.RoleMiddleware("coordinator", "admin"),
			controllers.UpdateDepartment,
		)
		depts.POST("/:id/image",
			middleware.AuthMiddleware(),
			middleware.RoleMiddleware("coordinator", "admin"),
			controllers.UploadDepartmentImage,
		)
		depts.DELETE("/:id",
			middleware.AuthMiddleware(),
			middleware.RoleMiddleware("coordinator", "admin"),
			controllers.DeleteDepartment,
		)
	}
}
