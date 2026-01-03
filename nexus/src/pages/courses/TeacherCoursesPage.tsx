import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Button, Card } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherCourses, deleteCourse, updateCourse } from '../../services/courseService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Course, CourseStatus } from '../../types';

export function TeacherCoursesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadCourses();
        }
    }, [user]);

    async function loadCourses() {
        if (!user) return;
        try {
            const data = await getTeacherCourses(user.uid);
            setCourses(data);

            // Fetch actual enrollment counts for each course
            const counts: Record<string, number> = {};
            for (const course of data) {
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('courseId', '==', course.id)
                );
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                counts[course.id] = enrollmentsSnap.size;
            }
            setEnrollmentCounts(counts);
        } catch (error) {
            console.error('Failed to load courses:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(courseId: string) {
        // Close menu first to prevent UI issues
        setActiveMenu(null);

        if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }
        try {
            await deleteCourse(courseId);
            setCourses(courses.filter((c) => c.id !== courseId));
        } catch (error) {
            console.error('Failed to delete course:', error);
            alert('Failed to delete course. Please try again.');
        }
    }

    async function handleStatusChange(courseId: string, status: CourseStatus) {
        try {
            await updateCourse(courseId, { status });
            setCourses(
                courses.map((c) => (c.id === courseId ? { ...c, status } : c))
            );
        } catch (error) {
            console.error('Failed to update course status:', error);
        }
        setActiveMenu(null);
    }

    const statusColors: Record<CourseStatus, { bg: string; text: string }> = {
        draft: { bg: 'var(--warning-light)', text: 'var(--warning)' },
        published: { bg: 'var(--success-light)', text: 'var(--success)' },
        archived: { bg: 'var(--bg-tertiary)', text: 'var(--text-muted)' },
    };

    return (
        <PageLayout>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--space-8)',
                }}
            >
                <div>
                    <h1
                        style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                            marginBottom: 'var(--space-1)',
                        }}
                    >
                        Your Courses
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        Create and manage your course content
                    </p>
                </div>
                <Button
                    icon={<Plus size={18} />}
                    onClick={() => navigate('/courses/new')}
                >
                    New Course
                </Button>
            </div>

            {/* Loading State */}
            {loading && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: 'var(--space-12)',
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
            )}

            {/* Empty State */}
            {!loading && courses.length === 0 && (
                <Card>
                    <div
                        style={{
                            padding: 'var(--space-12)',
                            textAlign: 'center',
                        }}
                    >
                        <BookOpen
                            size={48}
                            style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}
                        />
                        <h3
                            style={{
                                fontSize: 'var(--text-lg)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-2)',
                            }}
                        >
                            No courses yet
                        </h3>
                        <p
                            style={{
                                color: 'var(--text-muted)',
                                fontSize: 'var(--text-sm)',
                                marginBottom: 'var(--space-6)',
                            }}
                        >
                            Create your first course to start sharing knowledge with students.
                        </p>
                        <Button icon={<Plus size={18} />} onClick={() => navigate('/courses/new')}>
                            Create Your First Course
                        </Button>
                    </div>
                </Card>
            )}

            {/* Course Grid */}
            {!loading && courses.length > 0 && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--space-6)',
                    }}
                >
                    {courses.map((course) => (
                        <Card key={course.id} padding="none">
                            {/* Cover Image */}
                            <div
                                style={{
                                    height: '140px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    backgroundImage: course.coverImage
                                        ? `url(${course.coverImage})`
                                        : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    position: 'relative',
                                }}
                            >
                                {/* Status Badge */}
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 'var(--space-3)',
                                        left: 'var(--space-3)',
                                        padding: 'var(--space-1) var(--space-2)',
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: 'var(--font-medium)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        backgroundColor: statusColors[course.status].bg,
                                        color: statusColors[course.status].text,
                                    }}
                                >
                                    {course.status}
                                </span>

                                {/* Menu Button */}
                                <div style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)' }}>
                                    <button
                                        onClick={() => setActiveMenu(activeMenu === course.id ? null : course.id)}
                                        style={{
                                            padding: 'var(--space-2)',
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-default)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {activeMenu === course.id && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: 'var(--space-1)',
                                                backgroundColor: 'var(--bg-primary)',
                                                border: '1px solid var(--border-default)',
                                                boxShadow: 'var(--shadow-lg)',
                                                minWidth: '160px',
                                                zIndex: 10,
                                            }}
                                        >
                                            <button
                                                onClick={() => {
                                                    navigate(`/courses/${course.id}/edit`);
                                                    setActiveMenu(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    width: '100%',
                                                    padding: 'var(--space-3)',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--text-primary)',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Edit size={14} /> Edit Course
                                            </button>
                                            {course.status === 'draft' && (
                                                <button
                                                    onClick={() => handleStatusChange(course.id, 'published')}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-2)',
                                                        width: '100%',
                                                        padding: 'var(--space-3)',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: 'var(--text-sm)',
                                                        color: 'var(--success)',
                                                        textAlign: 'left',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    <Eye size={14} /> Publish
                                                </button>
                                            )}
                                            {course.status === 'published' && (
                                                <button
                                                    onClick={() => handleStatusChange(course.id, 'archived')}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-2)',
                                                        width: '100%',
                                                        padding: 'var(--space-3)',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: 'var(--text-sm)',
                                                        color: 'var(--text-secondary)',
                                                        textAlign: 'left',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                >
                                                    Archive
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(course.id);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    width: '100%',
                                                    padding: 'var(--space-3)',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--danger)',
                                                    textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--danger-light)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ padding: 'var(--space-4)' }}>
                                <Link
                                    to={`/courses/${course.id}`}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <h3
                                        style={{
                                            fontSize: 'var(--text-base)',
                                            fontWeight: 'var(--font-medium)',
                                            color: 'var(--text-primary)',
                                            marginBottom: 'var(--space-2)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {course.title}
                                    </h3>
                                </Link>
                                <p
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--text-muted)',
                                        marginBottom: 'var(--space-4)',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: 1.5,
                                        minHeight: '42px',
                                    }}
                                >
                                    {course.description || 'No description'}
                                </p>

                                {/* Stats */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-4)',
                                        paddingTop: 'var(--space-3)',
                                        borderTop: '1px solid var(--border-subtle)',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-1)',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        <Users size={14} />
                                        <span>{enrollmentCounts[course.id] || 0} enrolled</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Close menu on outside click */}
            {activeMenu && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 5,
                    }}
                    onClick={() => setActiveMenu(null)}
                />
            )}
        </PageLayout>
    );
}
