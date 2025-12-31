import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle,
    Circle,
    ChevronDown,
    ChevronRight,
    Clock,
    FileText,
    Download,
} from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getCourse, getModules, getLessons } from '../../services/courseService';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Course, Module, Lesson } from '../../types';

interface ModuleWithLessons extends Module {
    lessons: Lesson[];
    expanded: boolean;
}

interface Enrollment {
    id: string;
    progress: number;
    completedLessons: string[];
}

export function LessonViewerPage() {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [course, setCourse] = useState<Course | null>(null);
    const [modules, setModules] = useState<ModuleWithLessons[]>([]);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (courseId && user) {
            loadCourseData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, user?.uid]); // Use user.uid instead of user to prevent infinite loops

    useEffect(() => {
        // When lessonId changes, find and set current lesson
        if (!lessonId || modules.length === 0) return;

        for (const mod of modules) {
            const lesson = mod.lessons.find((l) => l.id === lessonId);
            if (lesson) {
                setCurrentLesson(lesson);
                setCurrentModuleId(mod.id);
                // Expand the module containing this lesson using functional update
                // to avoid needing modules in dependency array
                setModules((prevModules) =>
                    prevModules.map((m) => ({
                        ...m,
                        expanded: m.id === mod.id ? true : m.expanded,
                    }))
                );
                break;
            }
        }
        // Note: modules is intentionally excluded from deps because we use functional update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId]);

    async function loadCourseData() {
        if (!courseId || !user) return;
        setLoading(true);
        try {
            // Load course
            const courseData = await getCourse(courseId);
            setCourse(courseData);

            // Load modules and lessons
            const modulesData = await getModules(courseId);
            const modulesWithLessons: ModuleWithLessons[] = await Promise.all(
                modulesData.map(async (mod) => {
                    const lessons = await getLessons(courseId, mod.id);
                    return { ...mod, lessons, expanded: false };
                })
            );
            setModules(modulesWithLessons);

            // Get or set first lesson
            if (!lessonId && modulesWithLessons.length > 0 && modulesWithLessons[0].lessons.length > 0) {
                const firstLesson = modulesWithLessons[0].lessons[0];
                navigate(`/learn/${courseId}/${firstLesson.id}`, { replace: true });
            }

            // Load enrollment
            const enrollmentQuery = query(
                collection(db, 'enrollments'),
                where('courseId', '==', courseId),
                where('studentId', '==', user.uid)
            );
            const enrollmentSnap = await getDocs(enrollmentQuery);
            if (!enrollmentSnap.empty) {
                const enrollDoc = enrollmentSnap.docs[0];
                setEnrollment({
                    id: enrollDoc.id,
                    progress: enrollDoc.data().progress || 0,
                    completedLessons: enrollDoc.data().completedLessons || [],
                });
            }
        } catch (error) {
            console.error('Failed to load course:', error);
        } finally {
            setLoading(false);
        }
    }

    async function markLessonComplete() {
        if (!enrollment || !currentLesson || !currentModuleId) return;

        const lessonKey = `${currentModuleId}:${currentLesson.id}`;
        if (enrollment.completedLessons.includes(lessonKey)) return;

        setCompleting(true);
        try {
            // Calculate total lessons
            const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
            const newCompletedCount = enrollment.completedLessons.length + 1;
            const newProgress = Math.round((newCompletedCount / totalLessons) * 100);

            // Update enrollment in Firestore
            await updateDoc(doc(db, 'enrollments', enrollment.id), {
                completedLessons: arrayUnion(lessonKey),
                progress: newProgress,
            });

            // Update local state
            setEnrollment({
                ...enrollment,
                completedLessons: [...enrollment.completedLessons, lessonKey],
                progress: newProgress,
            });

            // Navigate to next lesson
            navigateToNextLesson();
        } catch (error) {
            console.error('Failed to mark lesson complete:', error);
        } finally {
            setCompleting(false);
        }
    }

    function navigateToNextLesson() {
        if (!currentLesson || !currentModuleId) return;

        // Find current position
        for (let mi = 0; mi < modules.length; mi++) {
            const mod = modules[mi];
            if (mod.id === currentModuleId) {
                const lessonIndex = mod.lessons.findIndex((l) => l.id === currentLesson.id);
                if (lessonIndex < mod.lessons.length - 1) {
                    // Next lesson in same module
                    navigate(`/learn/${courseId}/${mod.lessons[lessonIndex + 1].id}`);
                    return;
                } else if (mi < modules.length - 1 && modules[mi + 1].lessons.length > 0) {
                    // First lesson of next module
                    navigate(`/learn/${courseId}/${modules[mi + 1].lessons[0].id}`);
                    return;
                }
            }
        }
    }

    function isLessonCompleted(moduleId: string, lessonId: string): boolean {
        return enrollment?.completedLessons.includes(`${moduleId}:${lessonId}`) || false;
    }

    function toggleModule(moduleId: string) {
        setModules(
            modules.map((m) => ({
                ...m,
                expanded: m.id === moduleId ? !m.expanded : m.expanded,
            }))
        );
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
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>Course not found.</p>
                        <Button onClick={() => navigate('/my-courses')} style={{ marginTop: 'var(--space-4)' }}>
                            Back to My Courses
                        </Button>
                    </div>
                </Card>
            </PageLayout>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Sidebar - Course Outline */}
            <div
                style={{
                    width: '320px',
                    flexShrink: 0,
                    borderRight: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-primary)',
                    overflowY: 'auto',
                    height: '100vh',
                    position: 'sticky',
                    top: 0,
                }}
            >
                {/* Course Header */}
                <div
                    style={{
                        padding: 'var(--space-4)',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <button
                        onClick={() => navigate('/my-courses')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            padding: 0,
                            marginBottom: 'var(--space-3)',
                        }}
                    >
                        <ArrowLeft size={16} /> My Courses
                    </button>
                    <h2
                        style={{
                            fontSize: 'var(--text-base)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        {course.title}
                    </h2>
                    {/* Progress */}
                    <div style={{ marginTop: 'var(--space-3)' }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--text-muted)',
                                marginBottom: 'var(--space-1)',
                            }}
                        >
                            <span>Progress</span>
                            <span>{enrollment?.progress || 0}%</span>
                        </div>
                        <div
                            style={{
                                height: '4px',
                                backgroundColor: 'var(--bg-tertiary)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: `${enrollment?.progress || 0}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--accent)',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Modules List */}
                <div style={{ padding: 'var(--space-2)' }}>
                    {modules.map((module) => (
                        <div key={module.id} style={{ marginBottom: 'var(--space-1)' }}>
                            {/* Module Header */}
                            <button
                                onClick={() => toggleModule(module.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    width: '100%',
                                    padding: 'var(--space-3)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: 'var(--font-medium)',
                                }}
                            >
                                {module.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                {module.title}
                            </button>

                            {/* Lessons */}
                            {module.expanded && (
                                <div style={{ paddingLeft: 'var(--space-6)' }}>
                                    {module.lessons.map((lesson) => {
                                        const isCompleted = isLessonCompleted(module.id, lesson.id);
                                        const isActive = currentLesson?.id === lesson.id;
                                        return (
                                            <Link
                                                key={lesson.id}
                                                to={`/learn/${courseId}/${lesson.id}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    padding: 'var(--space-2) var(--space-3)',
                                                    fontSize: 'var(--text-sm)',
                                                    color: isActive
                                                        ? 'var(--accent)'
                                                        : isCompleted
                                                            ? 'var(--text-muted)'
                                                            : 'var(--text-secondary)',
                                                    textDecoration: 'none',
                                                    backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle size={14} style={{ color: 'var(--success)' }} />
                                                ) : (
                                                    <Circle size={14} />
                                                )}
                                                <span style={{ flex: 1 }}>{lesson.title}</span>
                                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                    {lesson.estimatedMinutes}m
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: 'var(--space-8)', overflowY: 'auto' }}>
                {currentLesson ? (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {/* Lesson Header */}
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h1
                                style={{
                                    fontSize: 'var(--text-2xl)',
                                    fontWeight: 'var(--font-semibold)',
                                    color: 'var(--text-primary)',
                                    marginBottom: 'var(--space-2)',
                                }}
                            >
                                {currentLesson.title}
                            </h1>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-4)',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                    <Clock size={14} /> {currentLesson.estimatedMinutes} min
                                </span>
                                {isLessonCompleted(currentModuleId!, currentLesson.id) && (
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)',
                                            color: 'var(--success)',
                                        }}
                                    >
                                        <CheckCircle size={14} /> Completed
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Lesson Content */}
                        <Card>
                            <div
                                style={{
                                    fontSize: 'var(--text-base)',
                                    lineHeight: 1.7,
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {currentLesson.content || 'No content available for this lesson.'}
                            </div>

                            {/* Attachments */}
                            {currentLesson.attachments && currentLesson.attachments.length > 0 && (
                                <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
                                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-3)' }}>
                                        Attachments
                                    </h3>
                                    {currentLesson.attachments.map((attachment) => (
                                        <a
                                            key={attachment.id}
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-2)',
                                                padding: 'var(--space-2) var(--space-3)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-subtle)',
                                                marginBottom: 'var(--space-2)',
                                                textDecoration: 'none',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            <FileText size={16} style={{ color: 'var(--accent)' }} />
                                            <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>{attachment.name}</span>
                                            <Download size={14} style={{ color: 'var(--text-muted)' }} />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Complete Button */}
                        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                            {isLessonCompleted(currentModuleId!, currentLesson.id) ? (
                                <Button variant="secondary" onClick={navigateToNextLesson}>
                                    Next Lesson <ChevronRight size={16} />
                                </Button>
                            ) : (
                                <Button onClick={markLessonComplete} loading={completing}>
                                    Mark Complete & Continue <ChevronRight size={16} />
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    <Card>
                        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                            <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>
                                Select a lesson from the sidebar to start learning.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
