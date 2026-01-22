import { v2 as cloudinary } from "cloudinary";

/**
 * Initialize Cloudinary configuration
 * Called lazily to ensure environment variables are loaded
 */
function initializeCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary configuration is missing. Please check your .env.local file."
    );
  }

  // Only configure if not already configured or if config changed
  if (
    cloudinary.config().cloud_name !== cloudName ||
    cloudinary.config().api_key !== apiKey
  ) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Upload result from Cloudinary
 */
export interface UploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
}

/**
 * Upload options for Cloudinary
 */
export interface UploadOptions {
  folder?: string; // Folder path in Cloudinary (e.g., "outlets", "payments")
  public_id?: string; // Custom public ID
  overwrite?: boolean; // Overwrite existing file
  resource_type?: "image" | "video" | "raw" | "auto";
  transformation?: Array<Record<string, unknown>>; // Image transformations
  maxFileSize?: number; // Max file size in bytes (default: 5MB)
  allowedFormats?: string[]; // Allowed file formats (default: ["jpg", "jpeg", "png", "webp"])
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param options - Upload options
 * @returns Validation result
 */
export function validateFile(
  file: File,
  options: UploadOptions = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxFileSize || 5 * 1024 * 1024; // 5MB default
  const allowedFormats = options.allowedFormats || [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedFormats.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Upload file to Cloudinary
 * @param file - File to upload (File object or base64 string)
 * @param options - Upload options
 * @returns Upload result with public_id and URLs
 */
export async function uploadToCloudinary(
  file: File | string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Initialize Cloudinary configuration
  try {
    initializeCloudinary();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Failed to initialize Cloudinary. Please check your environment variables."
    );
  }

  try {
    // Prepare upload options
    const uploadOptions: Record<string, unknown> = {
      resource_type: options.resource_type || "image",
      overwrite: options.overwrite || false,
    };

    if (options.folder) {
      uploadOptions.folder = options.folder;
    }

    if (options.public_id) {
      uploadOptions.public_id = options.public_id;
    }

    if (options.transformation) {
      uploadOptions.transformation = options.transformation;
    }

    let result;

    if (file instanceof File) {
      // Validate file if it's a File object
      const validation = validateFile(file, options);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Convert File to base64 data URI
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;

      // Upload to Cloudinary
      result = await cloudinary.uploader.upload(dataUri, uploadOptions);
    } else {
      // Base64 string upload
      result = await cloudinary.uploader.upload(file, uploadOptions);
    }

    // Type guard untuk memastikan result valid
    if (!result || !result.public_id) {
      throw new Error("Upload failed: Invalid response from Cloudinary");
    }

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    // Enhanced error handling with more details
    if (error instanceof Error) {
      // Check for specific Cloudinary errors
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes("invalid api key") || errorMessage.includes("401")) {
        throw new Error(
          "Cloudinary authentication failed. Please check your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.local"
        );
      }
      
      if (errorMessage.includes("cloud name") || errorMessage.includes("404")) {
        throw new Error(
          "Cloudinary cloud name not found. Please check your CLOUDINARY_CLOUD_NAME in .env.local"
        );
      }
      
      if (errorMessage.includes("file size") || errorMessage.includes("too large")) {
        throw new Error(
          `File size exceeds limit. ${error.message}`
        );
      }
      
      throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
    
    // Handle non-Error objects
    const errorString = String(error);
    throw new Error(`Cloudinary upload failed: ${errorString || "Unknown error"}`);
  }
}

/**
 * Delete file from Cloudinary
 * @param publicId - Public ID of the file to delete
 * @param resourceType - Resource type (default: "image")
 * @returns Deletion result
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<{ result: string }> {
  // Initialize Cloudinary configuration
  try {
    initializeCloudinary();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      "Failed to initialize Cloudinary. Please check your environment variables."
    );
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    return { result: result.result };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Cloudinary deletion failed: ${error.message}`);
    }
    throw new Error("Cloudinary deletion failed: Unknown error");
  }
}

/**
 * Generate Cloudinary URL with transformations
 * @param publicId - Public ID of the image
 * @param transformations - Image transformations
 * @returns Transformed image URL
 */
export function getCloudinaryUrl(
  publicId: string,
  transformations?: Array<Record<string, unknown>>
): string {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary cloud name is not configured");
  }

  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;

  if (transformations && transformations.length > 0) {
    const transformString = transformations
      .map((t) => Object.entries(t).map(([k, v]) => `${k}_${v}`).join(","))
      .join("/");
    return `${baseUrl}/${transformString}/${publicId}`;
  }

  return `${baseUrl}/${publicId}`;
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID or null
 */
export function extractPublicId(url: string): string | null {
  try {
    const urlParts = url.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      return null;
    }

    // Get the part after "upload" and before file extension
    const publicIdParts = urlParts.slice(uploadIndex + 2);
    const publicId = publicIdParts.join("/").split(".")[0];

    return publicId || null;
  } catch {
    return null;
  }
}

export { cloudinary };
