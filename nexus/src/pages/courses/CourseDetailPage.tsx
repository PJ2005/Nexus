import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    ChevronDown,
    ChevronRight,
    FileText,
    HelpCircle,
    ClipboardList,
    GripVertical,
    Upload,
    X,
} from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Button, Card, Input } from '../../components/ui';
import {
    getCourse,
    getModules,
    getLessons,
    createModule,
    updateModule,
    deleteModule,
    createLesson,
    updateLesson,
    deleteLesson,
    getCourseQuizzes,
    getCourseAssignments,
    updateCourse,
} from '../../services/courseService';
import { uploadFile, formatFileSize, getFileIcon } from '../../services/storageService';
import type { Course, Module, Lesson, Quiz, Assignment, CourseStatus, MaterialAttachment } from '../../types';

interface ModuleWithLessons extends Module {
    lessons: Lesson[];
    expanded: boolean;
}

export function CourseDetailPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<ModuleWithLessons[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'content' | 'quizzes' | 'assignments'>('content');

    // Modal states
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [editingModule, setEditingModule] = useState<Module | null>(null);
    const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson; moduleId: string } | null>(null);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    useEffect(() => {
        if (courseId) {
            loadCourseData();
        }
    }, [courseId]);

    async function loadCourseData() {
        if (!courseId) return;
        setLoading(true);
        try {
            const [courseData, modulesData, quizzesData, assignmentsData] = await Promise.all([
                getCourse(courseId),
                getModules(courseId),
                getCourseQuizzes(courseId),
                getCourseAssignments(courseId),
            ]);

            setCourse(courseData);
            setQuizzes(quizzesData);
            setAssignments(assignmentsData);

            // Load lessons for each module
            const modulesWithLessons: ModuleWithLessons[] = await Promise.all(
                modulesData.map(async (mod) => {
                    const lessons = await getLessons(courseId, mod.id);
                    return { ...mod, lessons, expanded: false };
                })
            );
            setModules(modulesWithLessons);
        } catch (error) {
            console.error('Failed to load course:', error);
        } finally {
            setLoading(false);
        }
    }

    function toggleModuleExpand(moduleId: string) {
        setModules(
            modules.map((m) =>
                m.id === moduleId ? { ...m, expanded: !m.expanded } : m
            )
        );
    }

    async function handlePublish() {
        if (!courseId || !course) return;
        const newStatus: CourseStatus = course.status === 'published' ? 'draft' : 'published';
        try {
            await updateCourse(courseId, { status: newStatus });
            setCourse({ ...course, status: newStatus });
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    }

    if (loading) {
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

    if (!course) {
        return (
            <PageLayout>
                <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <h2 style={{ color: 'var(--text-primary)' }}>Course not found</h2>
                    <Button variant="secondary" onClick={() => navigate('/courses')}>
                        Back to Courses
                    </Button>
                </div>
            </PageLayout>
        );
    }

    const tabs = [
        { id: 'content', label: 'Content', icon: <FileText size={16} /> },
        { id: 'quizzes', label: `Quizzes (${quizzes.length})`, icon: <HelpCircle size={16} /> },
        { id: 'assignments', label: `Assignments (${assignments.length})`, icon: <ClipboardList size={16} /> },
    ];

    return (
        <PageLayout>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <button
                    onClick={() => navigate('/courses')}
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
                    Back to Courses
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                            <h1
                                style={{
                                    fontSize: 'var(--text-2xl)',
                                    fontWeight: 'var(--font-semibold)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {course.title}
                            </h1>
                            <span
                                style={{
                                    padding: 'var(--space-1) var(--space-2)',
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 'var(--font-medium)',
                                    textTransform: 'uppercase',
                                    backgroundColor:
                                        course.status === 'published'
                                            ? 'var(--success-light)'
                                            : 'var(--warning-light)',
                                    color:
                                        course.status === 'published'
                                            ? 'var(--success)'
                                            : 'var(--warning)',
                                }}
                            >
                                {course.status}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                            {course.description || 'No description'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Button variant="secondary" onClick={() => navigate(`/courses/${courseId}/edit`)}>
                            <Edit size={16} /> Edit
                        </Button>
                        <Button
                            variant={course.status === 'published' ? 'secondary' : 'primary'}
                            onClick={handlePublish}
                        >
                            {course.status === 'published' ? 'Unpublish' : 'Publish'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-1)',
                    borderBottom: '1px solid var(--border-default)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3) var(--space-4)',
                            background: 'none',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-medium)',
                            cursor: 'pointer',
                            marginBottom: '-1px',
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Tab */}
            {activeTab === 'content' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                            Modules & Lessons
                        </h2>
                        <Button
                            icon={<Plus size={16} />}
                            onClick={() => {
                                setEditingModule(null);
                                setShowModuleModal(true);
                            }}
                        >
                            Add Module
                        </Button>
                    </div>

                    {modules.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>
                                    No modules yet. Add your first module to start building content.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {modules.map((module, index) => (
                                <Card key={module.id} padding="none">
                                    {/* Module Header */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: 'var(--space-4)',
                                            cursor: 'pointer',
                                            gap: 'var(--space-3)',
                                        }}
                                        onClick={() => toggleModuleExpand(module.id)}
                                    >
                                        <GripVertical size={16} style={{ color: 'var(--text-muted)' }} />
                                        {module.expanded ? (
                                            <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                                        ) : (
                                            <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                <span
                                                    style={{
                                                        fontSize: 'var(--text-xs)',
                                                        color: 'var(--text-muted)',
                                                        fontWeight: 'var(--font-medium)',
                                                    }}
                                                >
                                                    MODULE {index + 1}
                                                </span>
                                            </div>
                                            <h3
                                                style={{
                                                    fontSize: 'var(--text-base)',
                                                    fontWeight: 'var(--font-medium)',
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {module.title}
                                            </h3>
                                            {module.description && (
                                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                                                    {module.description}
                                                </p>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                            {module.lessons.length} lessons
                                        </span>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }} onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => {
                                                    setEditingModule(module);
                                                    setShowModuleModal(true);
                                                }}
                                                style={{
                                                    padding: 'var(--space-2)',
                                                    background: 'none',
                                                    border: '1px solid var(--border-default)',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                }}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Delete this module and all its lessons?')) {
                                                        await deleteModule(courseId!, module.id);
                                                        loadCourseData();
                                                    }
                                                }}
                                                style={{
                                                    padding: 'var(--space-2)',
                                                    background: 'none',
                                                    border: '1px solid var(--border-default)',
                                                    cursor: 'pointer',
                                                    color: 'var(--danger)',
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lessons List */}
                                    {module.expanded && (
                                        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            {module.lessons.map((lesson, lessonIndex) => (
                                                <div
                                                    key={lesson.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: 'var(--space-3) var(--space-4)',
                                                        paddingLeft: 'var(--space-12)',
                                                        gap: 'var(--space-3)',
                                                        borderBottom: '1px solid var(--border-subtle)',
                                                    }}
                                                >
                                                    <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                                            {lessonIndex + 1}. {lesson.title}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        {lesson.estimatedMinutes} min
                                                    </span>
                                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingLesson({ lesson, moduleId: module.id });
                                                                setShowLessonModal(true);
                                                            }}
                                                            style={{
                                                                padding: 'var(--space-1)',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--text-muted)',
                                                            }}
                                                        >
                                                            <Edit size={12} />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Delete this lesson?')) {
                                                                    await deleteLesson(courseId!, module.id, lesson.id);
                                                                    loadCourseData();
                                                                }
                                                            }}
                                                            style={{
                                                                padding: 'var(--space-1)',
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--danger)',
                                                            }}
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    setSelectedModuleId(module.id);
                                                    setEditingLesson(null);
                                                    setShowLessonModal(true);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    width: '100%',
                                                    padding: 'var(--space-3) var(--space-4)',
                                                    paddingLeft: 'var(--space-12)',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--accent)',
                                                    fontSize: 'var(--text-sm)',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <Plus size={14} />
                                                Add Lesson
                                            </button>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Quizzes Tab */}
            {activeTab === 'quizzes' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                            Quizzes & Tests
                        </h2>
                        <Button icon={<Plus size={16} />} onClick={() => navigate(`/courses/${courseId}/quizzes/new`)}>
                            Create Quiz
                        </Button>
                    </div>

                    {quizzes.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                <HelpCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>
                                    No quizzes yet. Create MCQ tests to assess student learning.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {quizzes.map((quiz) => (
                                <Card key={quiz.id} hover onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                                                {quiz.title}
                                            </h3>
                                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                                {quiz.questions.length} questions • {quiz.passingScore}% to pass
                                            </p>
                                        </div>
                                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                            Assignments
                        </h2>
                        <Button icon={<Plus size={16} />} onClick={() => navigate(`/courses/${courseId}/assignments/new`)}>
                            Create Assignment
                        </Button>
                    </div>

                    {assignments.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                <ClipboardList size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>
                                    No assignments yet. Create assignments for students to submit work.
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {assignments.map((assignment) => (
                                <Card key={assignment.id} hover onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                                                {assignment.title}
                                            </h3>
                                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                                Due: {assignment.dueDate.toDate().toLocaleDateString()} • Max score: {assignment.maxScore}
                                            </p>
                                        </div>
                                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Module Modal */}
            {showModuleModal && (
                <ModuleModal
                    courseId={courseId!}
                    module={editingModule}
                    moduleCount={modules.length}
                    onClose={() => {
                        setShowModuleModal(false);
                        setEditingModule(null);
                    }}
                    onSave={() => {
                        setShowModuleModal(false);
                        setEditingModule(null);
                        loadCourseData();
                    }}
                />
            )}

            {/* Lesson Modal */}
            {showLessonModal && (
                <LessonModal
                    courseId={courseId!}
                    moduleId={editingLesson?.moduleId || selectedModuleId!}
                    lesson={editingLesson?.lesson || null}
                    lessonCount={
                        modules.find((m) => m.id === (editingLesson?.moduleId || selectedModuleId))?.lessons.length || 0
                    }
                    onClose={() => {
                        setShowLessonModal(false);
                        setEditingLesson(null);
                        setSelectedModuleId(null);
                    }}
                    onSave={() => {
                        setShowLessonModal(false);
                        setEditingLesson(null);
                        setSelectedModuleId(null);
                        loadCourseData();
                    }}
                />
            )}
        </PageLayout>
    );
}

// Module Modal Component
function ModuleModal({
    courseId,
    module,
    moduleCount,
    onClose,
    onSave,
}: {
    courseId: string;
    module: Module | null;
    moduleCount: number;
    onClose: () => void;
    onSave: () => void;
}) {
    const [title, setTitle] = useState(module?.title || '');
    const [description, setDescription] = useState(module?.description || '');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
            if (module) {
                await updateModule(courseId, module.id, { title, description });
            } else {
                await createModule(courseId, {
                    title,
                    description,
                    order: moduleCount + 1,
                    estimatedMinutes: 0,
                });
            }
            onSave();
        } catch (error) {
            console.error('Failed to save module:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    width: '100%',
                    maxWidth: '480px',
                    padding: 'var(--space-6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-6)',
                    }}
                >
                    {module ? 'Edit Module' : 'Add Module'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <Input
                            label="Module Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Getting Started"
                            required
                        />
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
                                Description (optional)
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of this module"
                                rows={3}
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
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                            <Button type="submit" loading={loading}>
                                {module ? 'Save Changes' : 'Add Module'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Lesson Modal Component
function LessonModal({
    courseId,
    moduleId,
    lesson,
    lessonCount,
    onClose,
    onSave,
}: {
    courseId: string;
    moduleId: string;
    lesson: Lesson | null;
    lessonCount: number;
    onClose: () => void;
    onSave: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState(lesson?.title || '');
    const [content, setContent] = useState(lesson?.content || '');
    const [estimatedMinutes, setEstimatedMinutes] = useState(lesson?.estimatedMinutes || 15);
    const [attachments, setAttachments] = useState<MaterialAttachment[]>(lesson?.attachments || []);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map((file) =>
                uploadFile(file, courseId, 'lessons')
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
        if (!title.trim()) return;

        setLoading(true);
        try {
            if (lesson) {
                await updateLesson(courseId, moduleId, lesson.id, {
                    title,
                    content,
                    estimatedMinutes,
                    attachments,
                });
            } else {
                await createLesson(courseId, moduleId, {
                    title,
                    content,
                    order: lessonCount + 1,
                    estimatedMinutes,
                    attachments,
                });
            }
            onSave();
        } catch (error) {
            console.error('Failed to save lesson:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: 'var(--space-6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-6)',
                    }}
                >
                    {lesson ? 'Edit Lesson' : 'Add Lesson'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <Input
                            label="Lesson Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Introduction to Variables"
                            required
                        />
                        <Input
                            label="Estimated Duration (minutes)"
                            type="number"
                            value={estimatedMinutes}
                            onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                            min={1}
                        />
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
                                Content
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Write your lesson content here... (Markdown supported)"
                                rows={8}
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-3)',
                                    fontSize: 'var(--text-sm)',
                                    border: '1px solid var(--border-default)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    resize: 'vertical',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            />
                        </div>

                        {/* File Attachments */}
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
                                Attachments
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                            />

                            {/* Attachment List */}
                            {attachments.length > 0 && (
                                <div style={{ marginBottom: 'var(--space-3)' }}>
                                    {attachments.map((file) => (
                                        <div
                                            key={file.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-2)',
                                                padding: 'var(--space-2)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-subtle)',
                                                marginBottom: 'var(--space-2)',
                                            }}
                                        >
                                            <span style={{ fontSize: 'var(--text-base)' }}>
                                                {getFileIcon(file.type)}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                                    {file.name}
                                                </p>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                    {formatFileSize(file.size)}
                                                </p>
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
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                icon={uploading ? undefined : <Upload size={14} />}
                                loading={uploading}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploading ? 'Uploading...' : 'Upload Files'}
                            </Button>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                            <Button type="submit" loading={loading}>
                                {lesson ? 'Save Changes' : 'Add Lesson'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={onClose}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
