import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, BookOpen, ChevronRight, Mail, Calendar } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { getTeacherCourses } from '../../services/courseService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Course } from '../../types';

interface EnrolledStudent {
    id: string;
    name: string;
    email: string;
    enrolledAt: Date;
    courseId: string;
    courseTitle: string;
    progress: number;
}

export function StudentsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState<EnrolledStudent[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<string>('all');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        if (!user) return;
        try {
            // Load teacher's courses
            const coursesData = await getTeacherCourses(user.uid);
            setCourses(coursesData);

            // Load enrollments for all courses
            const allStudents: EnrolledStudent[] = [];

            for (const course of coursesData) {
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('courseId', '==', course.id)
                );
                const snapshot = await getDocs(enrollmentsQuery);

                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    allStudents.push({
                        id: doc.id,
                        name: data.studentName || 'Unknown',
                        email: data.studentEmail || '',
                        enrolledAt: data.enrolledAt?.toDate() || new Date(),
                        courseId: course.id,
                        courseTitle: course.title,
                        progress: data.progress || 0,
                    });
                }
            }

            setStudents(allStudents);
        } catch (error) {
            console.error('Failed to load students:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter students
    const filteredStudents = students.filter((student) => {
        const matchesSearch =
            student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCourse = selectedCourse === 'all' || student.courseId === selectedCourse;
        return matchesSearch && matchesCourse;
    });

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
                    Students
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    View and manage students enrolled in your courses
                </p>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                            style={{
                                padding: 'var(--space-2)',
                                backgroundColor: 'var(--accent-light)',
                                color: 'var(--accent)',
                            }}
                        >
                            <Users size={20} />
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                {students.length}
                            </p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Total Students</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                            style={{
                                padding: 'var(--space-2)',
                                backgroundColor: 'var(--success-light)',
                                color: 'var(--success)',
                            }}
                        >
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                {courses.filter((c) => c.status === 'published').length}
                            </p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active Courses</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <div
                style={{
                    display: 'flex',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ flex: 1, minWidth: '200px', maxWidth: '300px' }}>
                    <Input
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search size={16} />}
                    />
                </div>
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    style={{
                        padding: 'var(--space-2) var(--space-3)',
                        fontSize: 'var(--text-sm)',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                    }}
                >
                    <option value="all">All Courses</option>
                    {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                            {course.title}
                        </option>
                    ))}
                </select>
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
            {!loading && students.length === 0 && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                        <h3
                            style={{
                                fontSize: 'var(--text-lg)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-2)',
                            }}
                        >
                            No students yet
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                            Students will appear here when they enroll in your published courses.
                        </p>
                    </div>
                </Card>
            )}

            {/* Students List */}
            {!loading && filteredStudents.length > 0 && (
                <Card padding="none">
                    {/* Table Header */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 2fr 1fr 1fr',
                            padding: 'var(--space-3) var(--space-4)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border-default)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--font-medium)',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        <span>Student</span>
                        <span>Course</span>
                        <span>Progress</span>
                        <span>Enrolled</span>
                    </div>

                    {/* Table Body */}
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 2fr 1fr 1fr',
                                padding: 'var(--space-3) var(--space-4)',
                                borderBottom: '1px solid var(--border-subtle)',
                                alignItems: 'center',
                            }}
                        >
                            <div>
                                <p
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 'var(--font-medium)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {student.name}
                                </p>
                                <p
                                    style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                    }}
                                >
                                    <Mail size={12} /> {student.email}
                                </p>
                            </div>
                            <div>
                                <button
                                    onClick={() => navigate(`/courses/${student.courseId}`)}
                                    style={{
                                        fontSize: 'var(--text-sm)',
                                        color: 'var(--accent)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                    }}
                                >
                                    {student.courseTitle} <ChevronRight size={14} />
                                </button>
                            </div>
                            <div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            height: '6px',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${student.progress}%`,
                                                height: '100%',
                                                backgroundColor: 'var(--accent)',
                                            }}
                                        />
                                    </div>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                        {student.progress}%
                                    </span>
                                </div>
                            </div>
                            <div>
                                <span
                                    style={{
                                        fontSize: 'var(--text-xs)',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                    }}
                                >
                                    <Calendar size={12} />
                                    {student.enrolledAt.toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </Card>
            )}

            {/* No Results */}
            {!loading && students.length > 0 && filteredStudents.length === 0 && (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <p style={{ color: 'var(--text-muted)' }}>
                            No students match your search criteria.
                        </p>
                    </div>
                </Card>
            )}
        </PageLayout>
    );
}
