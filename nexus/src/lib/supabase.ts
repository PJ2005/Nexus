import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage bucket names
export const STORAGE_BUCKETS = {
    COURSE_DOCUMENTS: 'course-documents',
    COURSE_IMAGES: 'course-images',
} as const;

// Document chunks table interface
export interface DocumentChunk {
    id: string;
    document_id: string;
    content: string;
    metadata: {
        courseId?: string;
        lessonId?: string;
        pageNumber?: number;
        fileName?: string;
    };
    created_at: string;
}

// Helper to query document chunks for RAG
export async function queryDocumentChunks(
    courseId: string,
    limit: number = 10
): Promise<DocumentChunk[]> {
    const { data, error } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('metadata->>courseId', courseId)
        .limit(limit);

    if (error) {
        console.error('Error querying document chunks:', error);
        return [];
    }

    return data || [];
}
