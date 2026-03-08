package main

import (
	"log"
	"ojt-system/config"
	"ojt-system/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env vars")
	}

	// Connect Database
	config.ConnectDB()

	// Auto-migrate models
	config.MigrateDB()

	// Setup Gin router
	r := gin.Default()

	// Setup CORS
	config.SetupCORS(r)

	// Serve static files (uploads)
	r.Static("/uploads", "./uploads")

	// Register all routes
	routes.RegisterRoutes(r)

	// Start server
	port := config.GetEnv("PORT", "8080")
	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}
