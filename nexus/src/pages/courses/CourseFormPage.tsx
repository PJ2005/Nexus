import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X, Image as ImageIcon } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Button, Input, Card } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { createCourse, updateCourse, getCourse } from '../../services/courseService';
import { uploadCoverImage } from '../../services/storageService';

export function CourseFormPage() {
    const { courseId } = useParams();
    const isEditing = Boolean(courseId);
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingCourse, setLoadingCourse] = useState(isEditing);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditing && courseId) {
            loadCourse(courseId);
        }
    }, [courseId, isEditing]);

    async function loadCourse(id: string) {
        try {
            const course = await getCourse(id);
            if (course) {
                setTitle(course.title);
                setDescription(course.description);
                setCoverImage(course.coverImage || null);
            }
        } catch (err) {
            console.error('Failed to load course:', err);
            setError('Failed to load course');
        } finally {
            setLoadingCourse(false);
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file');
                return;
            }
            setCoverFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                setCoverImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    function removeCover() {
        setCoverFile(null);
        setCoverImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let coverUrl: string | null = coverImage;

            // Upload new cover image if selected
            if (coverFile) {
                const tempId = courseId || `temp_${Date.now()}`;
                try {
                    coverUrl = await uploadCoverImage(coverFile, tempId);
                } catch (uploadError) {
                    console.error('Cover image upload failed:', uploadError);
                    // Continue without cover image
                    coverUrl = null;
                }
            }

            // Build course data - only include coverImage if it has a value
            const courseData: { title: string; description: string; coverImage?: string } = {
                title: title.trim(),
                description: description.trim(),
            };
            if (coverUrl) {
                courseData.coverImage = coverUrl;
            }

            if (isEditing && courseId) {
                await updateCourse(courseId, courseData);
                navigate(`/courses/${courseId}`);
            } else {
                await createCourse(user.uid, user.displayName, courseData);
                // Navigate to courses list instead of course detail to avoid timing issues
                navigate('/courses');
            }
        } catch (err) {
            console.error('Failed to save course:', err);
            setError('Failed to save course. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (loadingCourse) {
        return (
            <PageLayout>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '60vh',
                    }}
                >
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            border: '3px solid var(--border-default)',
                            borderTopColor: 'var(--accent)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                        }}
                    />
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        color: 'var(--text-secondary)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-sm)',
                        padding: 0,
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                    }}
                >
                    {isEditing ? 'Edit Course' : 'Create New Course'}
                </h1>
            </div>

            <div style={{ maxWidth: '640px' }}>
                {error && (
                    <div
                        style={{
                            padding: 'var(--space-3) var(--space-4)',
                            backgroundColor: 'var(--danger-light)',
                            color: 'var(--danger)',
                            fontSize: 'var(--text-sm)',
                            marginBottom: 'var(--space-6)',
                            border: '1px solid var(--danger)',
                        }}
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <Card>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                            {/* Cover Image */}
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 'var(--font-medium)',
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    Cover Image
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                {coverImage ? (
                                    <div
                                        style={{
                                            position: 'relative',
                                            height: '180px',
                                            backgroundImage: `url(${coverImage})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '1px solid var(--border-default)',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={removeCover}
                                            style={{
                                                position: 'absolute',
                                                top: 'var(--space-2)',
                                                right: 'var(--space-2)',
                                                padding: 'var(--space-2)',
                                                backgroundColor: 'var(--bg-primary)',
                                                border: '1px solid var(--border-default)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 'var(--space-2)',
                                            width: '100%',
                                            height: '180px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px dashed var(--border-default)',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)',
                                            transition: 'all var(--transition-fast)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--accent)';
                                            e.currentTarget.style.color = 'var(--accent)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border-default)';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                        }}
                                    >
                                        <ImageIcon size={32} />
                                        <span style={{ fontSize: 'var(--text-sm)' }}>
                                            Click to upload cover image
                                        </span>
                                    </button>
                                )}
                            </div>

                            {/* Title */}
                            <Input
                                label="Course Title"
                                placeholder="e.g., Introduction to Machine Learning"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />

                            {/* Description */}
                            <div>
                                <label
                                    style={{
                                        display: 'block',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 'var(--font-medium)',
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    Description
                                </label>
                                <textarea
                                    placeholder="What will students learn in this course?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-3) var(--space-4)',
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-primary)',
                                        backgroundColor: 'var(--bg-primary)',
                                        border: '1px solid var(--border-default)',
                                        borderRadius: 0,
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Actions */}
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 'var(--space-3)',
                                    paddingTop: 'var(--space-4)',
                                    borderTop: '1px solid var(--border-subtle)',
                                }}
                            >
                                <Button type="submit" loading={loading}>
                                    {isEditing ? 'Save Changes' : 'Create Course'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => navigate(-1)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                </form>
            </div>
        </PageLayout>
    );
}
