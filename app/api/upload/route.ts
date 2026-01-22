import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  uploadToCloudinary,
  validateFile,
  type UploadOptions,
} from "@/lib/cloudinary";
import { z } from "zod";

/**
 * Upload request schema
 */
const uploadSchema = z.object({
  folder: z.string().optional(),
  public_id: z.string().optional(),
  overwrite: z.boolean().optional(),
  resource_type: z.enum(["image", "video", "raw", "auto"]).optional(),
  maxFileSize: z.number().optional(),
});

/**
 * POST /api/upload
 * Upload image/file to Cloudinary
 * 
 * Requires authentication
 * Supports multipart/form-data with file field
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Parse upload options from form data
    const folder = formData.get("folder")?.toString();
    const public_id = formData.get("public_id")?.toString();
    const overwrite = formData.get("overwrite")?.toString() === "true";
    const resource_type = formData.get("resource_type")?.toString() as
      | "image"
      | "video"
      | "raw"
      | "auto"
      | undefined;
    const maxFileSize = formData.get("maxFileSize")?.toString();

    // Validate upload options
    const optionsData = {
      folder,
      public_id,
      overwrite,
      resource_type,
      maxFileSize: maxFileSize ? parseInt(maxFileSize, 10) : undefined,
    };

    const validatedOptions = uploadSchema.parse(optionsData);

    // Prepare upload options
    const uploadOptions: UploadOptions = {
      folder: validatedOptions.folder,
      public_id: validatedOptions.public_id,
      overwrite: validatedOptions.overwrite,
      resource_type: validatedOptions.resource_type || "image",
      maxFileSize: validatedOptions.maxFileSize,
    };

    // Validate file
    const validation = validateFile(file, uploadOptions);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file, uploadOptions);

    return NextResponse.json(
      {
        success: true,
        data: {
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Return detailed error message
      return NextResponse.json(
        { 
          error: error.message,
          // Include more context in development
          ...(process.env.NODE_ENV === "development" && {
            details: error.stack,
          }),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
