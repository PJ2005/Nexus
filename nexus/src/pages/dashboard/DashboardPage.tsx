import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout';
import { Card, CardTitle, CardDescription, CardContent } from '../../components/ui';
import {
    BookOpen,
    Calendar,
    Target,
    TrendingUp,
    Users,
    Clock,
    ChevronRight,
} from 'lucide-react';
import { getTeacherCourses } from '../../services/courseService';
import type { Course } from '../../types';

export function DashboardPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.role === 'teacher') {
            loadTeacherData();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function loadTeacherData() {
        if (!user) return;
        try {
            const coursesData = await getTeacherCourses(user.uid);
            setCourses(coursesData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    const publishedCourses = courses.filter((c) => c.status === 'published');
    const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);

    return (
        <PageLayout>
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-1)',
                    }}
                >
                    Welcome back, {user?.displayName?.split(' ')[0]}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {user?.role === 'student'
                        ? "Here's your learning progress at a glance"
                        : user?.role === 'teacher'
                            ? 'Manage your courses and track student progress'
                            : 'System overview and management'}
                </p>
            </div>

            {/* Stats Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-8)',
                }}
            >
                {user?.role === 'student' && (
                    <>
                        <StatCard
                            icon={<BookOpen size={20} />}
                            label="Enrolled Courses"
                            value="0"
                            trend="+2 this month"
                        />
                        <StatCard
                            icon={<Target size={20} />}
                            label="Goals Completed"
                            value="0"
                            trend="0% complete"
                        />
                        <StatCard
                            icon={<Clock size={20} />}
                            label="Hours Learned"
                            value="0"
                            trend="This week"
                        />
                        <StatCard
                            icon={<TrendingUp size={20} />}
                            label="Current Streak"
                            value="0 days"
                            trend="Keep going!"
                        />
                    </>
                )}

                {user?.role === 'teacher' && (
                    <>
                        <StatCard
                            icon={<BookOpen size={20} />}
                            label="Your Courses"
                            value={String(courses.length)}
                            trend={`${publishedCourses.length} published`}
                            loading={loading}
                        />
                        <StatCard
                            icon={<Users size={20} />}
                            label="Total Students"
                            value={String(totalStudents)}
                            trend="Enrolled"
                            loading={loading}
                        />
                        <StatCard
                            icon={<TrendingUp size={20} />}
                            label="Avg. Completion"
                            value="0%"
                            trend="Across courses"
                        />
                        <StatCard
                            icon={<Clock size={20} />}
                            label="Content Hours"
                            value="0"
                            trend="Total duration"
                        />
                    </>
                )}

                {user?.role === 'admin' && (
                    <>
                        <StatCard
                            icon={<Users size={20} />}
                            label="Total Users"
                            value="0"
                            trend="Active"
                        />
                        <StatCard
                            icon={<BookOpen size={20} />}
                            label="Total Courses"
                            value="0"
                            trend="Published"
                        />
                        <StatCard
                            icon={<TrendingUp size={20} />}
                            label="Engagement"
                            value="0%"
                            trend="This month"
                        />
                        <StatCard
                            icon={<Clock size={20} />}
                            label="Avg. Session"
                            value="0 min"
                            trend="Per user"
                        />
                    </>
                )}
            </div>

            {/* Content Sections */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: 'var(--space-6)',
                }}
            >
                {user?.role === 'student' && (
                    <>
                        {/* Today's Schedule */}
                        <Card>
                            <CardTitle>Today's Schedule</CardTitle>
                            <CardDescription>Your AI-generated learning plan</CardDescription>
                            <CardContent>
                                <div
                                    style={{
                                        marginTop: 'var(--space-4)',
                                        padding: 'var(--space-6)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px dashed var(--border-default)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Calendar
                                        size={32}
                                        style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}
                                    />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                        No schedule generated yet.
                                        <br />
                                        Set your goals and availability to get started.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Courses */}
                        <Card>
                            <CardTitle>Continue Learning</CardTitle>
                            <CardDescription>Pick up where you left off</CardDescription>
                            <CardContent>
                                <div
                                    style={{
                                        marginTop: 'var(--space-4)',
                                        padding: 'var(--space-6)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px dashed var(--border-default)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <BookOpen
                                        size={32}
                                        style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}
                                    />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                        No courses enrolled yet.
                                        <br />
                                        Browse our catalog to get started.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {user?.role === 'teacher' && (
                    <>
                        {/* Your Courses */}
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <CardTitle>Your Courses</CardTitle>
                                    <CardDescription>Manage your course content</CardDescription>
                                </div>
                                <Link
                                    to="/courses"
                                    style={{
                                        color: 'var(--accent)',
                                        fontSize: 'var(--text-sm)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-1)',
                                        textDecoration: 'none',
                                    }}
                                >
                                    View all <ChevronRight size={14} />
                                </Link>
                            </div>
                            <CardContent>
                                {loading ? (
                                    <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                                        <div
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                border: '2px solid var(--border-default)',
                                                borderTopColor: 'var(--accent)',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                                margin: '0 auto',
                                            }}
                                        />
                                    </div>
                                ) : courses.length === 0 ? (
                                    <div
                                        style={{
                                            marginTop: 'var(--space-4)',
                                            padding: 'var(--space-6)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px dashed var(--border-default)',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <BookOpen
                                            size={32}
                                            style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}
                                        />
                                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                            No courses created yet.
                                            <br />
                                            Create your first course to get started.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        {courses.slice(0, 3).map((course) => (
                                            <Link
                                                key={course.id}
                                                to={`/courses/${course.id}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: 'var(--space-3)',
                                                    marginBottom: 'var(--space-2)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    textDecoration: 'none',
                                                    border: '1px solid var(--border-subtle)',
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
                                                        {course.title}
                                                    </p>
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        {course.enrolledCount} students
                                                    </p>
                                                </div>
                                                <span
                                                    style={{
                                                        padding: 'var(--space-1) var(--space-2)',
                                                        fontSize: 'var(--text-xs)',
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
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card>
                            <CardTitle>Student Activity</CardTitle>
                            <CardDescription>Recent enrollments and progress</CardDescription>
                            <CardContent>
                                <div
                                    style={{
                                        marginTop: 'var(--space-4)',
                                        padding: 'var(--space-6)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px dashed var(--border-default)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Users
                                        size={32}
                                        style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}
                                    />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                        No student activity yet.
                                        <br />
                                        Publish courses to attract students.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {user?.role === 'admin' && (
                    <>
                        <Card>
                            <CardTitle>System Overview</CardTitle>
                            <CardDescription>Platform health and metrics</CardDescription>
                            <CardContent>
                                <div
                                    style={{
                                        marginTop: 'var(--space-4)',
                                        padding: 'var(--space-6)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px dashed var(--border-default)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <TrendingUp
                                        size={32}
                                        style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}
                                    />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                        Metrics will appear here
                                        <br />
                                        as the platform grows.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardTitle>Recent Users</CardTitle>
                            <CardDescription>Newest platform members</CardDescription>
                            <CardContent>
                                <div
                                    style={{
                                        marginTop: 'var(--space-4)',
                                        padding: 'var(--space-6)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px dashed var(--border-default)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Users
                                        size={32}
                                        style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}
                                    />
                                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                                        User list will appear here.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </PageLayout>
    );
}

// Stat Card Component
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: string;
    loading?: boolean;
}

function StatCard({ icon, label, value, trend, loading }: StatCardProps) {
    return (
        <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <div
                    style={{
                        padding: 'var(--space-2)',
                        backgroundColor: 'var(--accent-light)',
                        color: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {icon}
                </div>
                <div style={{ flex: 1 }}>
                    <p
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            marginBottom: 'var(--space-1)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        {label}
                    </p>
                    <p
                        style={{
                            fontSize: 'var(--text-xl)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                            lineHeight: 1,
                        }}
                    >
                        {loading ? '...' : value}
                    </p>
                    <p
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            marginTop: 'var(--space-1)',
                        }}
                    >
                        {trend}
                    </p>
                </div>
            </div>
        </Card>
    );
}
