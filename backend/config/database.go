package config

import (
	"fmt"
	"log"
	"ojt-system/models"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDB() {
	var dsn string
	dbURL := os.Getenv("DATABASE_URL")

	if dbURL != "" {
		// Use the full URL if provided (standard on Render/Heroku)
		dsn = dbURL
	} else {
		// Fallback to manual construction
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			GetEnv("DB_HOST", "localhost"),
			GetEnv("DB_USER", "postgres"),
			GetEnv("DB_PASSWORD", "postgres"),
			GetEnv("DB_NAME", "ojt_system"),
			GetEnv("DB_PORT", "5432"),
		)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("❌ Failed to connect to database using DSN: %s", dsn)
		log.Fatal("Failed to connect to database:", err)
	}

	DB = db
	log.Println("✅ Database connected successfully")
}

func MigrateDB() {
	DB.AutoMigrate(
		&models.Department{}, // must be before User (User has FK to Department)
		&models.User{},
		&models.Company{},
		&models.OJTAssignment{},
		&models.TimeLog{},
		&models.Evaluation{},
		&models.Document{},
		&models.Notification{},
		&models.Journal{},
		&models.Announcement{},
		&models.Message{},
	)
	log.Println("Database migrated successfully")
	seedAdmin()
}

func seedAdmin() {
	var count int64
	DB.Model(&models.User{}).Where("role = ?", "admin").Count(&count)
	if count == 0 {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("password@123"), bcrypt.DefaultCost)
		admin := models.User{
			Name:     "Super Admin",
			Email:    "superadmin@gmail.com",
			Password: string(hashed),
			Role:     "admin",
			Status:   "active",
		}
		DB.Create(&admin)
		log.Println("✅ Default super admin account created: superadmin@gmail.com / password@123")
	}
}

func SetupCORS(r *gin.Engine) {
	allowedOrigins := []string{
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:5174",
		"http://127.0.0.1:5174",
	}

	// Support comma-separated FRONTEND_URL env var, e.g.:
	// FRONTEND_URL=https://ojt-system.vercel.app,https://ojt-system-git-develop.vercel.app
	if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
		for _, url := range strings.Split(frontendURL, ",") {
			url = strings.TrimSpace(url)
			if url != "" {
				allowedOrigins = append(allowedOrigins, url)
			}
		}
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))
}

func GetEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
