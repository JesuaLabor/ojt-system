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

// UploadFile uploads an opened multipart file to Cloudinary or local storage.
// ResourceType can be "image", "video", or "raw" (for documents).
func UploadFile(file multipart.File, publicID string, folder string, resourceType string) (string, error) {
	if CloudinaryClient == nil {
		localDir := filepath.Join("uploads", filepath.FromSlash(folder))
		if err := os.MkdirAll(localDir, os.ModePerm); err != nil {
			return "", fmt.Errorf("failed to create local upload directory: %w", err)
		}
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
		baseURL := GetEnv("APP_BASE_URL", "http://localhost:8080")
		return fmt.Sprintf("%s/uploads/%s/%s", baseURL, folder, filename), nil
	}

	ctx := context.Background()
	resp, err := CloudinaryClient.Upload.Upload(ctx, file, uploader.UploadParams{
		PublicID:       publicID,
		Folder:         folder,
		ResourceType:   resourceType,
		UniqueFilename: boolPtr(true),
		Overwrite:      boolPtr(true),
	})
	if err != nil {
		return "", fmt.Errorf("cloudinary upload failed: %w", err)
	}
	return resp.SecureURL, nil
}

