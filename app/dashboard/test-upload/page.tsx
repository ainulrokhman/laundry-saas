"use client";

import { DashboardLayout } from "@/components/layout";
import { Card, ImageUpload } from "@/components/common";
import { useState } from "react";

/**
 * Test Upload Page
 * Page untuk testing image upload functionality
 */
export default function TestUploadPage() {
  const [uploadResult, setUploadResult] = useState<{
    url: string;
    publicId: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadComplete = (url: string, publicId: string) => {
    setUploadResult({ url, publicId });
    setUploadError(null);
    console.log("Upload successful:", { url, publicId });
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    setUploadResult(null);
    console.error("Upload error:", error);
  };

  return (
    <DashboardLayout>
      <div className="row">
        <div className="col-12">
          <h1 className="mb-4">Test Image Upload</h1>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <Card title="Upload Image">
            <ImageUpload
              folder="test"
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              label="Choose Image"
              preview={true}
              maxFileSize={5 * 1024 * 1024} // 5MB
            />
          </Card>
        </div>

        <div className="col-md-6">
          <Card title="Upload Result">
            {uploadResult && (
              <div>
                <h5 className="text-success mb-3">
                  <i className="fas fa-check-circle me-2"></i>Upload Successful!
                </h5>
                <div className="mb-3">
                  <strong>Public ID:</strong>
                  <br />
                  <code className="d-block p-2 bg-light rounded">
                    {uploadResult.publicId}
                  </code>
                </div>
                <div className="mb-3">
                  <strong>URL:</strong>
                  <br />
                  <a
                    href={uploadResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-block p-2 bg-light rounded text-break"
                  >
                    {uploadResult.url}
                  </a>
                </div>
                <div className="mb-3">
                  <strong>Preview:</strong>
                  <br />
                  <img
                    src={uploadResult.url}
                    alt="Uploaded"
                    className="img-thumbnail mt-2"
                    style={{ maxWidth: "100%", maxHeight: "300px" }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div>
                <h5 className="text-danger mb-3">
                  <i className="fas fa-exclamation-circle me-2"></i>Upload
                  Failed
                </h5>
                <div className="alert alert-danger">{uploadError}</div>
              </div>
            )}

            {!uploadResult && !uploadError && (
              <div className="text-muted">
                <i className="fas fa-info-circle me-2"></i>Upload an image to
                see the result here.
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <Card title="Test Different Folders">
            <p className="mb-3">
              Test upload dengan folder berbeda untuk organisasi file:
            </p>
            <div className="row">
              <div className="col-md-4">
                <h6>Payments Folder</h6>
                <ImageUpload
                  folder="payments"
                  onUploadComplete={(url, publicId) => {
                    console.log("Payment upload:", { url, publicId });
                    alert(`Payment proof uploaded!\nPublic ID: ${publicId}`);
                  }}
                  onUploadError={handleUploadError}
                  label="Upload Payment Proof"
                  preview={false}
                />
              </div>
              <div className="col-md-4">
                <h6>Outlets Folder</h6>
                <ImageUpload
                  folder="outlets"
                  onUploadComplete={(url, publicId) => {
                    console.log("Outlet upload:", { url, publicId });
                    alert(`Outlet logo uploaded!\nPublic ID: ${publicId}`);
                  }}
                  onUploadError={handleUploadError}
                  label="Upload Outlet Logo"
                  preview={false}
                />
              </div>
              <div className="col-md-4">
                <h6>Test Folder</h6>
                <ImageUpload
                  folder="test"
                  onUploadComplete={(url, publicId) => {
                    console.log("Test upload:", { url, publicId });
                    alert(`Test image uploaded!\nPublic ID: ${publicId}`);
                  }}
                  onUploadError={handleUploadError}
                  label="Upload Test Image"
                  preview={false}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-12">
          <Card title="API Testing Instructions">
            <h6>1. Test via Browser Console:</h6>
            <pre className="bg-light p-3 rounded">
              <code>{`// Test upload via fetch API
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'test');

fetch('/api/upload', {
  method: 'POST',
  body: formData
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));`}</code>
            </pre>

            <h6 className="mt-3">2. Test via cURL:</h6>
            <pre className="bg-light p-3 rounded">
              <code>{`curl -X POST http://localhost:3000/api/upload \\
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \\
  -F "file=@/path/to/image.jpg" \\
  -F "folder=test"`}</code>
            </pre>

            <h6 className="mt-3">3. Check Environment Variables:</h6>
            <p>
              Pastikan file <code>.env.local</code> sudah diisi dengan:
            </p>
            <ul>
              <li>
                <code>CLOUDINARY_CLOUD_NAME</code>
              </li>
              <li>
                <code>CLOUDINARY_API_KEY</code>
              </li>
              <li>
                <code>CLOUDINARY_API_SECRET</code>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
