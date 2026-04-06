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

	// Init Cloudinary (warn but don't fatal — dev may not have creds yet)
	if err := config.InitCloudinary(); err != nil {
		log.Printf("⚠️  Cloudinary not configured: %v", err)
		log.Println("   Avatar uploads will fail until CLOUDINARY_* env vars are set.")
	} else {
		log.Println("✅ Cloudinary initialised")
	}

	// Setup Gin router
	r := gin.Default()

	// Setup CORS
	config.SetupCORS(r)

	// Keep /uploads route for backward-compat with any old local avatars
	r.Static("/uploads", "./uploads")

	// Register all routes
	routes.RegisterRoutes(r)

	// Start server
	port := config.GetEnv("PORT", "8080")
	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}
