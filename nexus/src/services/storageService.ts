import { supabase, STORAGE_BUCKETS } from '../lib/supabase';
import { Timestamp } from 'firebase/firestore';
import type { MaterialAttachment } from '../types';

// Generate unique file path
function generateFilePath(
    courseId: string,
    fileName: string,
    folder?: string
): string {
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const basePath = folder
        ? `${courseId}/${folder}/${timestamp}_${safeName}`
        : `${courseId}/${timestamp}_${safeName}`;
    return basePath;
}

// Upload a file to Supabase storage
export async function uploadFile(
    file: File,
    courseId: string,
    folder?: string
): Promise<MaterialAttachment> {
    const filePath = generateFilePath(courseId, file.name, folder);

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.COURSE_DOCUMENTS)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const {
        data: { publicUrl },
    } = supabase.storage
        .from(STORAGE_BUCKETS.COURSE_DOCUMENTS)
        .getPublicUrl(data.path);

    return {
        id: data.path,
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
        uploadedAt: Timestamp.now(),
    };
}

// Upload course cover image
export async function uploadCoverImage(
    file: File,
    courseId: string
): Promise<string> {
    const filePath = `covers/${courseId}_${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.COURSE_IMAGES)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
        });

    if (error) {
        throw new Error(`Failed to upload cover image: ${error.message}`);
    }

    const {
        data: { publicUrl },
    } = supabase.storage
        .from(STORAGE_BUCKETS.COURSE_IMAGES)
        .getPublicUrl(data.path);

    return publicUrl;
}

// Delete a file from storage
export async function deleteFile(
    filePath: string,
    bucket: string = STORAGE_BUCKETS.COURSE_DOCUMENTS
): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}

// Get file download URL with expiration
export async function getSignedUrl(
    filePath: string,
    expiresIn: number = 3600
): Promise<string> {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.COURSE_DOCUMENTS)
        .createSignedUrl(filePath, expiresIn);

    if (error) {
        throw new Error(`Failed to get signed URL: ${error.message}`);
    }

    return data.signedUrl;
}

// Format file size for display
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Get file icon based on mime type
export function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📎';
}
