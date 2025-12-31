import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, ChevronRight } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getPublishedCourses } from '../../services/courseService';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Course } from '../../types';


export function BrowseCoursesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [enrollingId, setEnrollingId] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                // Load published courses
                const coursesData = await getPublishedCourses();
                setCourses(coursesData);

                // Load user's enrollments
                if (user) {
                    const enrollmentsQuery = query(
                        collection(db, 'enrollments'),
                        where('studentId', '==', user.uid)
                    );
                    const snapshot = await getDocs(enrollmentsQuery);
                    const enrolled = new Set<string>();
                    snapshot.docs.forEach((doc) => {
                        enrolled.add(doc.data().courseId);
                    });
                    setEnrolledCourseIds(enrolled);
                }
            } catch (error) {
                console.error('Failed to load courses:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [user?.uid]); // Use user.uid instead of user object to prevent infinite loops

    async function handleEnroll(courseId: string) {
        if (!user) return;

        setEnrollingId(courseId);
        try {
            // Create enrollment record
            await addDoc(collection(db, 'enrollments'), {
                courseId,
                studentId: user.uid,
                studentName: user.displayName || 'Unknown',
                studentEmail: user.email,
                enrolledAt: serverTimestamp(),
                progress: 0,
                completedLessons: [],
            });

            // Update local state
            setEnrolledCourseIds((prev) => new Set([...prev, courseId]));

            // Navigate to course
            navigate(`/learn/${courseId}`);
        } catch (error) {
            console.error('Failed to enroll:', error);
            alert('Failed to enroll. Please try again.');
        } finally {
            setEnrollingId(null);
        }
    }

    // Filter courses by search
    const filteredCourses = courses.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageLayout>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-1)',
                    }}
                >
                    Browse Courses
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    Discover new courses and expand your knowledge
                </p>
            </div>

            {/* Search */}
            <div style={{ maxWidth: '400px', marginBottom: 'var(--space-6)' }}>
                <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search size={16} />}
                />
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
            {!loading && courses.length === 0 && (
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
                            No courses available yet
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                            Check back later for new courses from our teachers.
                        </p>
                    </div>
                </Card>
            )}

            {/* Course Grid */}
            {!loading && filteredCourses.length > 0 && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--space-6)',
                    }}
                >
                    {filteredCourses.map((course) => {
                        const isEnrolled = enrolledCourseIds.has(course.id);
                        return (
                            <Card key={course.id} padding="none">
                                {/* Cover Image */}
                                <div
                                    style={{
                                        height: '160px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        backgroundImage: course.coverImage
                                            ? `url(${course.coverImage})`
                                            : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                />

                                {/* Content */}
                                <div style={{ padding: 'var(--space-4)' }}>
                                    <h3
                                        style={{
                                            fontSize: 'var(--text-base)',
                                            fontWeight: 'var(--font-medium)',
                                            color: 'var(--text-primary)',
                                            marginBottom: 'var(--space-2)',
                                        }}
                                    >
                                        {course.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontSize: 'var(--text-sm)',
                                            color: 'var(--text-muted)',
                                            marginBottom: 'var(--space-3)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            minHeight: '40px',
                                        }}
                                    >
                                        {course.description || 'No description'}
                                    </p>

                                    {/* Teacher */}
                                    <p
                                        style={{
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--text-secondary)',
                                            marginBottom: 'var(--space-3)',
                                        }}
                                    >
                                        by {course.teacherName}
                                    </p>

                                    {/* Stats */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-4)',
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--text-muted)',
                                            marginBottom: 'var(--space-4)',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                            <Users size={12} /> {course.enrolledCount} students
                                        </span>
                                    </div>

                                    {/* Action */}
                                    {isEnrolled ? (
                                        <Link
                                            to={`/learn/${course.id}`}
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Button variant="secondary" style={{ width: '100%' }}>
                                                Continue Learning <ChevronRight size={16} />
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button
                                            onClick={() => handleEnroll(course.id)}
                                            loading={enrollingId === course.id}
                                            style={{ width: '100%' }}
                                        >
                                            Enroll Now
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* No Results */}
            {!loading && courses.length > 0 && filteredCourses.length === 0 && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>
                            No courses match your search.
                        </p>
                    </div>
                </Card>
            )}
        </PageLayout>
    );
}
