/**
 * File Upload Service
 * 
 * Handles file uploads to Cloudinary for payment proofs and other documents.
 */

import crypto from 'crypto';

export interface UploadSignature {
    cloudName: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
}

export class FileUploadService {
    private cloudName: string;
    private apiKey: string;
    private apiSecret: string;
    private baseFolder: string;

    constructor() {
        this.cloudName = this.envRequired('CLOUDINARY_CLOUD_NAME');
        this.apiKey = this.envRequired('CLOUDINARY_API_KEY');
        this.apiSecret = this.envRequired('CLOUDINARY_API_SECRET');
        this.baseFolder = String(process.env.CLOUDINARY_FOLDER ?? 'laundry-saas').trim();
    }

    private envRequired(name: string): string {
        const v = String(process.env[name] ?? '').trim();
        if (!v) throw new Error(`${name} environment variable not set`);
        return v;
    }

    private sha1(input: string): string {
        return crypto.createHash('sha1').update(input).digest('hex');
    }

    private randomId(): string {
        return crypto.randomBytes(8).toString('hex');
    }

    /**
     * Generate Cloudinary upload signature for client-side upload
     */
    generateUploadSignature(outletId: string, kind: string): UploadSignature {
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = `${this.baseFolder}/payments/${outletId}`;
        const publicId = `${kind}-${this.randomId()}`;

        // Cloudinary signature: sort params & sha1("k=v&..."+apiSecret)
        const toSign = [
            `folder=${folder}`,
            `public_id=${publicId}`,
            `timestamp=${timestamp}`
        ].join('&');

        const signature = this.sha1(`${toSign}${this.apiSecret}`);

        return {
            cloudName: this.cloudName,
            apiKey: this.apiKey,
            timestamp,
            signature,
            folder,
            publicId,
        };
    }

    /**
     * Validate file type for payment proofs
     */
    validatePaymentProof(fileType: string): boolean {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        return allowedTypes.includes(fileType.toLowerCase());
    }

    /**
     * Validate file size (max 5MB for payment proofs)
     */
    validateFileSize(fileSize: number): boolean {
        const maxSize = 5 * 1024 * 1024; // 5MB
        return fileSize <= maxSize;
    }
}
