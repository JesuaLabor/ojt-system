package routes

import (
	"ojt-system/controllers"
	"ojt-system/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")

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
		protected.GET("me", controllers.GetMe)         // GET  /api/me
		protected.PUT("me", controllers.UpdateProfile) // PUT  /api/me

		// ── Time Logs ─────────────────────────────────────────────────────────
		timelogs := protected.Group("/timelogs")
		{
			// Student endpoints
			timelogs.POST("/", controllers.CreateTimeLog)     // POST   /api/timelogs        — manual entry (clock_in + optional clock_out)
			timelogs.POST("/clockin", controllers.ClockIn)    // POST   /api/timelogs/clockin — instant clock-in (now)
			timelogs.PATCH("/clockout", controllers.ClockOut) // PATCH  /api/timelogs/clockout — instant clock-out (now)
			timelogs.GET("/", controllers.GetMyTimeLogs)      // GET    /api/timelogs/?status=pending

			// Supervisor / Coordinator / Faculty endpoints
			timelogs.GET("/:student_id",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty"),
				controllers.GetStudentTimeLogs, // GET  /api/timelogs/:student_id?status=&date_from=&date_to=
			)
			timelogs.GET("/:student_id/summary",
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty"),
				controllers.GetStudentSummary, // GET  /api/timelogs/:student_id/summary
			)
			timelogs.PATCH("/:id/approve",
				middleware.RoleMiddleware("supervisor", "coordinator"),
				controllers.ApproveTimeLog, // PATCH /api/timelogs/:id/approve
			)
			timelogs.PATCH("/:id/reject",
				middleware.RoleMiddleware("supervisor", "coordinator"),
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
				middleware.RoleMiddleware("supervisor", "coordinator", "faculty"),
				controllers.GetStudentEvaluations, // GET /api/evaluations/:student_id
			)
		}
	}
}
