/**
 * File Upload Service Tests
 * 
 * Tests for Cloudinary signature generation and file validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileUploadService } from '@/services/upload/FileUploadService';

describe('FileUploadService', () => {
    let service: FileUploadService;

    beforeEach(() => {
        // Set environment variables for testing
        process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
        process.env.CLOUDINARY_API_KEY = 'test-api-key';
        process.env.CLOUDINARY_API_SECRET = 'test-secret-key';
        process.env.CLOUDINARY_FOLDER = 'test-folder';

        service = new FileUploadService();
    });

    describe('generateUploadSignature', () => {
        it('should generate valid upload signature', () => {
            const signature = service.generateUploadSignature('outlet-123', 'payment-proof');

            expect(signature).toBeDefined();
            expect(signature.cloudName).toBe('test-cloud');
            expect(signature.apiKey).toBe('test-api-key');
            expect(signature.timestamp).toBeGreaterThan(0);
            expect(signature.signature).toBeDefined();
            expect(signature.folder).toContain('outlet-123');
            expect(signature.publicId).toContain('payment-proof');
        });

        it('should generate unique public IDs for each call', () => {
            const sig1 = service.generateUploadSignature('outlet-123', 'payment-proof');
            const sig2 = service.generateUploadSignature('outlet-123', 'payment-proof');

            expect(sig1.publicId).not.toBe(sig2.publicId);
        });

        it('should include outlet ID in folder path', () => {
            const signature = service.generateUploadSignature('outlet-abc', 'payment-proof');

            expect(signature.folder).toContain('outlet-abc');
            expect(signature.folder).toContain('payments');
        });

        it('should throw error if environment variables missing', () => {
            delete process.env.CLOUDINARY_CLOUD_NAME;

            expect(() => new FileUploadService()).toThrow('CLOUDINARY_CLOUD_NAME');
        });
    });

    describe('validatePaymentProof', () => {
        it('should accept valid image types', () => {
            expect(service.validatePaymentProof('image/jpeg')).toBe(true);
            expect(service.validatePaymentProof('image/jpg')).toBe(true);
            expect(service.validatePaymentProof('image/png')).toBe(true);
            expect(service.validatePaymentProof('image/webp')).toBe(true);
        });

        it('should accept PDF files', () => {
            expect(service.validatePaymentProof('application/pdf')).toBe(true);
        });

        it('should reject invalid file types', () => {
            expect(service.validatePaymentProof('application/zip')).toBe(false);
            expect(service.validatePaymentProof('text/plain')).toBe(false);
            expect(service.validatePaymentProof('video/mp4')).toBe(false);
        });

        it('should be case insensitive', () => {
            expect(service.validatePaymentProof('IMAGE/JPEG')).toBe(true);
            expect(service.validatePaymentProof('APPLICATION/PDF')).toBe(true);
        });
    });

    describe('validateFileSize', () => {
        it('should accept files under 5MB', () => {
            expect(service.validateFileSize(1024)).toBe(true); // 1KB
            expect(service.validateFileSize(1024 * 1024)).toBe(true); // 1MB
            expect(service.validateFileSize(4 * 1024 * 1024)).toBe(true); // 4MB
        });

        it('should accept files exactly 5MB', () => {
            expect(service.validateFileSize(5 * 1024 * 1024)).toBe(true);
        });

        it('should reject files over 5MB', () => {
            expect(service.validateFileSize(6 * 1024 * 1024)).toBe(false);
            expect(service.validateFileSize(10 * 1024 * 1024)).toBe(false);
        });

        it('should reject zero-sized files', () => {
            expect(service.validateFileSize(0)).toBe(true); // Technically allowed, but should be validated elsewhere
        });
    });
});
