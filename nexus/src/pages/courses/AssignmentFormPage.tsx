import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2, Upload, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { PageLayout } from '../../components/layout';
import { Button, Card, Input } from '../../components/ui';
import {
    createAssignment,
    updateAssignment,
    getAssignment,
    deleteAssignment,
    getModules,
} from '../../services/courseService';
import { uploadFile, formatFileSize, getFileIcon } from '../../services/storageService';
import type { MaterialAttachment, Module } from '../../types';

export function AssignmentFormPage() {
    const { courseId, assignmentId } = useParams();
    const isEditing = Boolean(assignmentId);
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('23:59');
    const [maxScore, setMaxScore] = useState(100);
    const [moduleId, setModuleId] = useState<string>('');
    const [attachments, setAttachments] = useState<MaterialAttachment[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingAssignment, setLoadingAssignment] = useState(isEditing);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (courseId) {
            loadModules();
        }
        if (isEditing && assignmentId) {
            loadAssignment(assignmentId);
        }
    }, [courseId, assignmentId, isEditing]);

    async function loadModules() {
        if (!courseId) return;
        try {
            const data = await getModules(courseId);
            setModules(data);
        } catch (error) {
            console.error('Failed to load modules:', error);
        }
    }

    async function loadAssignment(id: string) {
        try {
            const assignment = await getAssignment(id);
            if (assignment) {
                setTitle(assignment.title);
                setDescription(assignment.description);
                setInstructions(assignment.instructions);
                const date = assignment.dueDate.toDate();
                setDueDate(date.toISOString().split('T')[0]);
                setDueTime(date.toTimeString().slice(0, 5));
                setMaxScore(assignment.maxScore);
                setModuleId(assignment.moduleId || '');
                setAttachments(assignment.attachments);
            }
        } catch (error) {
            console.error('Failed to load assignment:', error);
        } finally {
            setLoadingAssignment(false);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || !courseId) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map((file) =>
                uploadFile(file, courseId, 'assignments')
            );
            const uploaded = await Promise.all(uploadPromises);
            setAttachments([...attachments, ...uploaded]);
        } catch (error) {
            console.error('Failed to upload files:', error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    function removeAttachment(id: string) {
        setAttachments(attachments.filter((a) => a.id !== id));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!courseId || !title.trim() || !dueDate) return;

        setLoading(true);
        try {
            const dueDateTimestamp = Timestamp.fromDate(new Date(`${dueDate}T${dueTime}`));

            if (isEditing && assignmentId) {
                await updateAssignment(assignmentId, {
                    title,
                    description,
                    instructions,
                    dueDate: dueDateTimestamp,
                    maxScore,
                    moduleId: moduleId || undefined,
                    attachments,
                });
            } else {
                await createAssignment(courseId, {
                    title,
                    description,
                    instructions,
                    dueDate: dueDateTimestamp,
                    maxScore,
                    moduleId: moduleId || undefined,
                    attachments,
                });
            }
            navigate(`/courses/${courseId}`);
        } catch (error) {
            console.error('Failed to save assignment:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!assignmentId || !confirm('Are you sure you want to delete this assignment?')) return;
        try {
            await deleteAssignment(assignmentId);
            navigate(`/courses/${courseId}`);
        } catch (error) {
            console.error('Failed to delete assignment:', error);
        }
    }

    if (loadingAssignment) {
        return (
            <PageLayout>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
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
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
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
                    Back to Course
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {isEditing ? 'Edit Assignment' : 'Create Assignment'}
                    </h1>
                    {isEditing && (
                        <Button variant="danger" onClick={handleDelete}>
                            <Trash2 size={16} /> Delete
                        </Button>
                    )}
                </div>
            </div>

            <div style={{ maxWidth: '720px' }}>
                <form onSubmit={handleSubmit}>
                    <Card style={{ marginBottom: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                            {/* Title */}
                            <Input
                                label="Assignment Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Week 1 Project Submission"
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
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief overview of the assignment..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-3)',
                                        fontSize: 'var(--text-sm)',
                                        border: '1px solid var(--border-default)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Instructions */}
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
                                    Instructions
                                </label>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Detailed instructions for students..."
                                    rows={6}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-3)',
                                        fontSize: 'var(--text-sm)',
                                        border: '1px solid var(--border-default)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Due Date & Score */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                    gap: 'var(--space-4)',
                                }}
                            >
                                <Input
                                    label="Due Date"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Due Time"
                                    type="time"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                />
                                <Input
                                    label="Max Score"
                                    type="number"
                                    value={maxScore}
                                    onChange={(e) => setMaxScore(Number(e.target.value))}
                                    min={1}
                                />
                            </div>

                            {/* Module Selection */}
                            {modules.length > 0 && (
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
                                        Attach to Module (optional)
                                    </label>
                                    <select
                                        value={moduleId}
                                        onChange={(e) => setModuleId(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            fontSize: 'var(--text-sm)',
                                            border: '1px solid var(--border-default)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        <option value="">No module</option>
                                        {modules.map((mod) => (
                                            <option key={mod.id} value={mod.id}>
                                                {mod.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Attachments */}
                    <Card style={{ marginBottom: 'var(--space-6)' }}>
                        <h3
                            style={{
                                fontSize: 'var(--text-base)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-4)',
                            }}
                        >
                            Reference Materials
                        </h3>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />

                        {/* File List */}
                        {attachments.length > 0 && (
                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                {attachments.map((file) => (
                                    <div
                                        key={file.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-3)',
                                            padding: 'var(--space-3)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-subtle)',
                                            marginBottom: 'var(--space-2)',
                                        }}
                                    >
                                        <span style={{ fontSize: 'var(--text-lg)' }}>{getFileIcon(file.type)}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                                {file.name}
                                            </div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                {formatFileSize(file.size)}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(file.id)}
                                            style={{
                                                padding: 'var(--space-1)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Button */}
                        <Button
                            type="button"
                            variant="secondary"
                            icon={uploading ? undefined : <Upload size={16} />}
                            loading={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? 'Uploading...' : 'Upload Files'}
                        </Button>
                    </Card>

                    {/* Submit */}
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Button type="submit" loading={loading}>
                            {isEditing ? 'Save Changes' : 'Create Assignment'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </PageLayout>
    );
}
