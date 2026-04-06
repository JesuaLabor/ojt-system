package config

import (
	"context"
	"fmt"
	"mime/multipart"

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

	if cloudName == "" || apiKey == "" || apiSecret == "" {
		return fmt.Errorf("cloudinary credentials not set (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)")
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
func UploadImage(file multipart.File, publicID string, folder string) (string, error) {
	if CloudinaryClient == nil {
		return "", fmt.Errorf("cloudinary client not initialised")
	}

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
