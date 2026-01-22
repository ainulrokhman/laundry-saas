"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "./Button";
import { Badge } from "./Badge";

interface ImageUploadProps {
  onUploadComplete: (url: string, publicId: string) => void;
  onUploadError?: (error: string) => void;
  folder?: string; // Cloudinary folder (e.g., "outlets", "payments")
  maxFileSize?: number; // Max file size in bytes (default: 5MB)
  allowedFormats?: string[]; // Allowed file formats
  label?: string;
  className?: string;
  preview?: boolean; // Show image preview
  required?: boolean;
}

/**
 * Image Upload Component
 * Handles file upload to Cloudinary via API
 * Displays preview and upload progress
 */
export function ImageUpload({
  onUploadComplete,
  onUploadError,
  folder,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  allowedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  label = "Upload Image",
  className = "",
  preview = true,
  required = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate file before upload
   */
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds maximum allowed size of ${maxFileSize / 1024 / 1024}MB`;
    }

    // Check file type
    if (!allowedFormats.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedFormats.join(", ")}`;
    }

    return null;
  };

  /**
   * Handle file selection
   */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onUploadError) {
        onUploadError(validationError);
      }
      return;
    }

    // Show preview
    if (preview) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload file
    await uploadFile(file);
  };

  /**
   * Upload file to Cloudinary via API
   */
  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folder) {
        formData.append("folder", folder);
      }
      formData.append("maxFileSize", maxFileSize.toString());
      formData.append("resource_type", "image");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Call success callback
      onUploadComplete(data.data.url, data.data.public_id);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle button click to trigger file input
   */
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Clear preview and reset
   */
  const handleClear = () => {
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`image-upload ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={allowedFormats.join(",")}
        onChange={handleFileChange}
        className="d-none"
        disabled={uploading}
      />

      {/* Preview */}
      {preview && previewUrl && (
        <div className="mb-3">
          <img
            src={previewUrl}
            alt="Preview"
            className="img-thumbnail"
            style={{ maxWidth: "300px", maxHeight: "300px" }}
          />
        </div>
      )}

      {/* Upload Button */}
      <div className="d-flex gap-2 align-items-center">
        <Button
          variant="primary"
          onClick={handleButtonClick}
          disabled={uploading}
          icon={uploading ? "fas fa-spinner fa-spin" : "fas fa-upload"}
          iconPosition="left"
        >
          {uploading ? "Uploading..." : "Choose File"}
        </Button>

        {previewUrl && (
          <Button variant="secondary" onClick={handleClear} disabled={uploading}>
            <i className="fas fa-times me-2"></i>Clear
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2">
          <Badge color="danger">{error}</Badge>
        </div>
      )}

      {/* File Info */}
      {maxFileSize && (
        <small className="text-muted d-block mt-2">
          Max file size: {maxFileSize / 1024 / 1024}MB. Allowed formats:{" "}
          {allowedFormats.map((f) => f.split("/")[1]).join(", ")}
        </small>
      )}
    </div>
  );
}
