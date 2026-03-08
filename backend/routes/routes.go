package routes

import (
	"ojt-system/controllers"
	"ojt-system/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")

	// ─── Public Routes ───────────────────────────────────
	auth := api.Group("/auth")
	{
		auth.POST("/register", controllers.Register)
		auth.POST("/login", controllers.Login)
	}

	// ─── Protected Routes ────────────────────────────────
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// Me
		protected.GET("me", controllers.GetMe)

		// Time Logs
		timelogs := protected.Group("/timelogs")
		{
			timelogs.POST("/clockin", controllers.ClockIn)
			timelogs.PATCH("/clockout", controllers.ClockOut)
			timelogs.GET("/", controllers.GetMyTimeLogs)
			timelogs.GET("/:student_id", middleware.RoleMiddleware("supervisor", "coordinator", "faculty"), controllers.GetStudentTimeLogs)
			timelogs.PATCH("/:id/approve", middleware.RoleMiddleware("supervisor", "coordinator"), controllers.ApproveTimeLog)
			timelogs.PATCH("/:id/reject", middleware.RoleMiddleware("supervisor", "coordinator"), controllers.RejectTimeLog)
		}

		// Evaluations
		evaluations := protected.Group("/evaluations")
		{
			evaluations.POST("/", middleware.RoleMiddleware("supervisor"), controllers.CreateEvaluation)
			evaluations.GET("/me", controllers.GetMyEvaluations)
			evaluations.GET("/:student_id", middleware.RoleMiddleware("supervisor", "coordinator", "faculty"), controllers.GetStudentEvaluations)
		}
	}
}
