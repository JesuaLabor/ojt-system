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

	// Add a simple recovery middleware to catch panics
	r.Use(gin.Recovery())

	// Setup CORS
	log.Println("⚙️  Setting up CORS...")
	config.SetupCORS(r)

	// Health check for Render (root / and /api/health)
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "OJT System API is running"})
	})

	// Keep /uploads route for backward-compat
	r.Static("/uploads", "./uploads")

	// Register all routes
	log.Println("🛣️  Registering routes...")
	routes.RegisterRoutes(r)

	// Start server
	port := config.GetEnv("PORT", "8080")
	log.Printf("🚀 Server is attempting to start on port %s...", port)
	
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("❌ Server failed to start: %v", err)
	}
}
