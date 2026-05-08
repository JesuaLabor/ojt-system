package config

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

// boolPtr is a tiny helper to get a *bool from a literal.
func boolPtr(b bool) *bool { return &b }

// CloudinaryClient is the shared Cloudinary instance (initialised on first use).
var CloudinaryClient *cloudinary.Cloudinary

// InitCloudinary sets up the Cloudinary client using environment variables:
//
//	CLOUDINARY_CLOUD_NAME
//	CLOUDINARY_API_KEY
//	CLOUDINARY_API_SECRET
func InitCloudinary() error {
	cloudName := GetEnv("CLOUDINARY_CLOUD_NAME", "")
	apiKey := GetEnv("CLOUDINARY_API_KEY", "")
	apiSecret := GetEnv("CLOUDINARY_API_SECRET", "")

	if cloudName == "" || apiKey == "" || apiSecret == "" ||
		cloudName == "your_cloud_name" || apiKey == "your_api_key" {
		return fmt.Errorf("cloudinary credentials not set or still using placeholders")
	}

	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return fmt.Errorf("failed to create cloudinary client: %w", err)
	}

	CloudinaryClient = cld
	return nil
}

// UploadImage uploads an opened multipart file to Cloudinary under the given
// folder and public-ID prefix, and returns the secure HTTPS URL.
// If Cloudinary is not configured, it saves the file locally in the "uploads" directory.
func UploadImage(file multipart.File, publicID string, folder string) (string, error) {
	if CloudinaryClient == nil {
		// ── Local fallback ────────────────────────────────────────────────────
		// filepath.FromSlash converts "/" to the OS path separator so that a
		// Cloudinary folder string like "ojt-system/departments" becomes the
		// correct nested directory on disk.
		localDir := filepath.Join("uploads", filepath.FromSlash(folder))
		if err := os.MkdirAll(localDir, os.ModePerm); err != nil {
			return "", fmt.Errorf("failed to create local upload directory: %w", err)
		}

		// filepath.Base strips any accidental path components from the publicID
		// so we only use it as a plain filename.
		filename := filepath.Base(publicID)
		localPath := filepath.Join(localDir, filename)

		dst, err := os.Create(localPath)
		if err != nil {
			return "", fmt.Errorf("failed to create local file: %w", err)
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			return "", fmt.Errorf("failed to write local file: %w", err)
		}

		// Build a URL the frontend can fetch.
		// main.go already serves   r.Static("/uploads", "./uploads")
		baseURL := GetEnv("APP_BASE_URL", "http://localhost:8080")
		return fmt.Sprintf("%s/uploads/%s/%s", baseURL, folder, filename), nil
	}

	// ── Cloudinary upload ─────────────────────────────────────────────────────
	ctx := context.Background()
	resp, err := CloudinaryClient.Upload.Upload(ctx, file, uploader.UploadParams{
		PublicID:       publicID,
		Folder:         folder,
		ResourceType:   "image",
		UniqueFilename: boolPtr(true),
		Overwrite:      boolPtr(true),
	})
	if err != nil {
		return "", fmt.Errorf("cloudinary upload failed: %w", err)
	}

	if resp.SecureURL == "" {
		return "", fmt.Errorf("cloudinary returned an empty URL — check credentials and upload settings")
	}

	return resp.SecureURL, nil
}
