import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Play, CheckCircle, Clock } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, Button } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCourse } from '../../services/courseService';
import type { Course } from '../../types';

interface EnrollmentWithCourse {
    enrollmentId: string;
    courseId: string;
    course: Course;
    progress: number;
    completedLessons: string[];
    enrolledAt: Date;
}

export function MyCoursesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadEnrollments() {
            if (!user) return;
            try {
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('studentId', '==', user.uid)
                );
                const snapshot = await getDocs(enrollmentsQuery);

                const enrollmentsWithCourses: EnrollmentWithCourse[] = [];

                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    const course = await getCourse(data.courseId);
                    if (course) {
                        enrollmentsWithCourses.push({
                            enrollmentId: doc.id,
                            courseId: data.courseId,
                            course,
                            progress: data.progress || 0,
                            completedLessons: data.completedLessons || [],
                            enrolledAt: data.enrolledAt?.toDate() || new Date(),
                        });
                    }
                }

                setEnrollments(enrollmentsWithCourses);
            } catch (error) {
                console.error('Failed to load enrollments:', error);
            } finally {
                setLoading(false);
            }
        }

        if (user?.uid) {
            loadEnrollments();
        }
    }, [user?.uid]); // Use user.uid instead of user object to prevent infinite loops

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
                        My Courses
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        Continue learning from where you left off
                    </p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/browse')}>
                    Browse More Courses
                </Button>
            </div>

            {/* Loading */}
            {loading && (
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
            )}

            {/* Empty State */}
            {!loading && enrollments.length === 0 && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
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
                            Start your learning journey by enrolling in a course.
                        </p>
                        <Button onClick={() => navigate('/browse')}>
                            Browse Courses
                        </Button>
                    </div>
                </Card>
            )}

            {/* Courses Grid */}
            {!loading && enrollments.length > 0 && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: 'var(--space-6)',
                    }}
                >
                    {enrollments.map((enrollment) => (
                        <Card key={enrollment.enrollmentId} padding="none">
                            {/* Cover */}
                            <div
                                style={{
                                    height: '120px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    backgroundImage: enrollment.course.coverImage
                                        ? `url(${enrollment.course.coverImage})`
                                        : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    position: 'relative',
                                }}
                            >
                                {/* Progress Badge */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 'var(--space-2)',
                                        right: 'var(--space-2)',
                                        padding: 'var(--space-1) var(--space-2)',
                                        backgroundColor: 'var(--bg-primary)',
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: 'var(--font-medium)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                    }}
                                >
                                    {enrollment.progress === 100 ? (
                                        <>
                                            <CheckCircle size={12} style={{ color: 'var(--success)' }} />
                                            <span style={{ color: 'var(--success)' }}>Complete</span>
                                        </>
                                    ) : (
                                        <>
                                            <Clock size={12} style={{ color: 'var(--accent)' }} />
                                            <span style={{ color: 'var(--text-primary)' }}>{enrollment.progress}%</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ padding: 'var(--space-4)' }}>
                                <h3
                                    style={{
                                        fontSize: 'var(--text-base)',
                                        fontWeight: 'var(--font-medium)',
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--space-1)',
                                    }}
                                >
                                    {enrollment.course.title}
                                </h3>
                                <p
                                    style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--text-muted)',
                                        marginBottom: 'var(--space-3)',
                                    }}
                                >
                                    by {enrollment.course.teacherName}
                                </p>

                                {/* Progress Bar */}
                                <div
                                    style={{
                                        height: '4px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        marginBottom: 'var(--space-4)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${enrollment.progress}%`,
                                            height: '100%',
                                            backgroundColor:
                                                enrollment.progress === 100 ? 'var(--success)' : 'var(--accent)',
                                            transition: 'width 0.3s ease',
                                        }}
                                    />
                                </div>

                                {/* Action */}
                                <Link to={`/learn/${enrollment.courseId}`} style={{ textDecoration: 'none' }}>
                                    <Button
                                        variant={enrollment.progress === 0 ? 'primary' : 'secondary'}
                                        style={{ width: '100%' }}
                                        icon={<Play size={16} />}
                                    >
                                        {enrollment.progress === 0
                                            ? 'Start Learning'
                                            : enrollment.progress === 100
                                                ? 'Review Course'
                                                : 'Continue Learning'}
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </PageLayout>
    );
}
