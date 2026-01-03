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

    Coffee,
    FileText,
    RefreshCw,
} from 'lucide-react';
import { getTeacherCourses, getCourse } from '../../services/courseService';
import { getStudentProfile, getSchedule, getDateString } from '../../services/scheduleService';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Course, Schedule } from '../../types';

interface StudentStats {
    enrolledCourses: number;
    completedGoals: number;
    totalGoals: number;
    hoursLearned: number;
    currentStreak: number;
}

interface TeacherStats {
    totalStudents: number;
    avgCompletion: number;
    contentHours: number;
}

interface AdminStats {
    totalUsers: number;
    totalCourses: number;
    totalStudents: number;
    totalTeachers: number;
}

interface EnrolledCourseInfo {
    courseId: string;
    title: string;
    progress: number;
}

export function DashboardPage() {
    const { user } = useAuth();

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentStats, setStudentStats] = useState<StudentStats>({
        enrolledCourses: 0,
        completedGoals: 0,
        totalGoals: 0,
        hoursLearned: 0,
        currentStreak: 0,
    });
    const [teacherStats, setTeacherStats] = useState<TeacherStats>({
        totalStudents: 0,
        avgCompletion: 0,
        contentHours: 0,
    });
    const [adminStats, setAdminStats] = useState<AdminStats>({
        totalUsers: 0,
        totalCourses: 0,
        totalStudents: 0,
        totalTeachers: 0,
    });
    const [recentActivity, setRecentActivity] = useState<{
        studentName: string;
        courseName: string;
        action: string;
        date: Date;
    }[]>([]);
    const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
    const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseInfo[]>([]);
    const [courseEnrollmentCounts, setCourseEnrollmentCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (user && user.role === 'teacher') {
            loadTeacherData();
        } else if (user && user.role === 'student') {
            loadStudentData();
        } else if (user && user.role === 'admin') {
            loadAdminData();
        } else {
            setLoading(false);
        }
    }, [user]);

    async function loadStudentData() {
        if (!user) return;
        try {
            // Fetch enrolled courses
            const enrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user.uid)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            const enrolledCount = enrollmentsSnap.size;

            // Fetch course details for enrolled courses
            const courseInfos: EnrolledCourseInfo[] = [];
            for (const enrollDoc of enrollmentsSnap.docs) {
                const enrollData = enrollDoc.data();
                try {
                    const course = await getCourse(enrollData.courseId);
                    if (course) {
                        courseInfos.push({
                            courseId: course.id,
                            title: course.title,
                            progress: enrollData.progress || 0,
                        });
                    }
                } catch (err) {
                    console.warn('Could not fetch course:', enrollData.courseId);
                }
            }
            setEnrolledCourses(courseInfos);

            // Fetch today's schedule
            const today = getDateString();
            const schedule = await getSchedule(user.uid, today);
            setTodaySchedule(schedule);

            // Fetch student profile for goals
            const profile = await getStudentProfile(user.uid);
            const goals = profile?.goals || [];
            const completedGoals = goals.filter(g => g.completed).length;

            // Fetch schedules for hours calculation
            const schedulesQuery = query(
                collection(db, 'schedules'),
                where('studentId', '==', user.uid)
            );
            const schedulesSnap = await getDocs(schedulesQuery);
            let totalMinutes = 0;
            schedulesSnap.docs.forEach(doc => {
                const data = doc.data();
                totalMinutes += data.completedMinutes || 0;
            });

            // Calculate streak
            let streak = 0;
            const todayDate = new Date();
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(todayDate);
                checkDate.setDate(checkDate.getDate() - i);
                const dateStr = checkDate.toISOString().split('T')[0];
                const hasSchedule = schedulesSnap.docs.some(d => d.data().date === dateStr && d.data().completedMinutes > 0);
                if (hasSchedule) {
                    streak++;
                } else if (i > 0) {
                    break;
                }
            }

            setStudentStats({
                enrolledCourses: enrolledCount,
                completedGoals: completedGoals,
                totalGoals: goals.length,
                hoursLearned: Math.round(totalMinutes / 60 * 10) / 10,
                currentStreak: streak,
            });
        } catch (error) {
            console.error('Failed to load student data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTeacherData() {
        if (!user) return;
        try {
            const coursesData = await getTeacherCourses(user.uid);
            setCourses(coursesData);

            // Count total enrolled students across all courses
            let totalEnrolled = 0;
            let totalCompletionSum = 0;
            let enrollmentCount = 0;
            const activityList: { studentName: string; courseName: string; action: string; date: Date }[] = [];
            const courseEnrollCounts: Record<string, number> = {};

            for (const course of coursesData) {
                // Get enrollments for this course
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('courseId', '==', course.id)
                );
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                totalEnrolled += enrollmentsSnap.size;
                courseEnrollCounts[course.id] = enrollmentsSnap.size;

                // Calculate average completion and collect activity
                for (const enrollDoc of enrollmentsSnap.docs) {
                    const data = enrollDoc.data();
                    totalCompletionSum += (data.progress || 0);
                    enrollmentCount++;

                    // Get student name
                    let studentName = 'Student';
                    try {
                        const userDoc = await getDoc(doc(db, 'users', data.studentId));
                        if (userDoc.exists()) {
                            studentName = userDoc.data().displayName || 'Student';
                        }
                    } catch (e) {
                        // Ignore error, use default name
                    }

                    activityList.push({
                        studentName,
                        courseName: course.title,
                        action: data.progress > 0 ? `${data.progress}% complete` : 'Enrolled',
                        date: data.enrolledAt?.toDate() || new Date(),
                    });
                }
            }

            // Sort by date and take recent 5
            activityList.sort((a, b) => b.date.getTime() - a.date.getTime());
            setRecentActivity(activityList.slice(0, 5));
            setCourseEnrollmentCounts(courseEnrollCounts);

            setTeacherStats({
                totalStudents: totalEnrolled,
                avgCompletion: enrollmentCount > 0 ? Math.round(totalCompletionSum / enrollmentCount) : 0,
                contentHours: 0, // Would need to fetch lessons separately
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadAdminData() {
        try {
            // Count total users
            const usersSnap = await getDocs(collection(db, 'users'));
            const totalUsers = usersSnap.size;

            let studentCount = 0;
            let teacherCount = 0;
            usersSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.role === 'student') studentCount++;
                else if (data.role === 'teacher') teacherCount++;
            });

            // Count total courses
            const coursesSnap = await getDocs(collection(db, 'courses'));
            const totalCourses = coursesSnap.size;

            setAdminStats({
                totalUsers,
                totalCourses,
                totalStudents: studentCount,
                totalTeachers: teacherCount,
            });
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    }

    const publishedCourses = courses.filter((c) => c.status === 'published');

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
                            value={String(studentStats.enrolledCourses)}
                            trend="Active enrollments"
                            loading={loading}
                        />
                        <StatCard
                            icon={<Target size={20} />}
                            label="Goals Completed"
                            value={`${studentStats.completedGoals}/${studentStats.totalGoals}`}
                            trend={studentStats.totalGoals > 0 ? `${Math.round(studentStats.completedGoals / studentStats.totalGoals * 100)}% complete` : 'Set your goals'}
                            loading={loading}
                        />
                        <StatCard
                            icon={<Clock size={20} />}
                            label="Hours Learned"
                            value={String(studentStats.hoursLearned)}
                            trend="Total study time"
                            loading={loading}
                        />
                        <StatCard
                            icon={<TrendingUp size={20} />}
                            label="Current Streak"
                            value={`${studentStats.currentStreak} days`}
                            trend={studentStats.currentStreak > 0 ? 'Keep going!' : 'Start today!'}
                            loading={loading}
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
                            value={String(teacherStats.totalStudents)}
                            trend="Enrolled"
                            loading={loading}
                        />
                        <StatCard
                            icon={<TrendingUp size={20} />}
                            label="Avg. Completion"
                            value={`${teacherStats.avgCompletion}%`}
                            trend="Across courses"
                            loading={loading}
                        />
                        <StatCard
                            icon={<Clock size={20} />}
                            label="Content Hours"
                            value={String(teacherStats.contentHours)}
                            trend="Total duration"
                            loading={loading}
                        />
                    </>
                )}

                {user?.role === 'admin' && (
                    <>
                        <StatCard
                            icon={<Users size={20} />}
                            label="Total Users"
                            value={String(adminStats.totalUsers)}
                            trend={`${adminStats.totalStudents} students, ${adminStats.totalTeachers} teachers`}
                            loading={loading}
                        />
                        <StatCard
                            icon={<BookOpen size={20} />}
                            label="Total Courses"
                            value={String(adminStats.totalCourses)}
                            trend="In platform"
                            loading={loading}
                        />
                        <StatCard
                            icon={<TrendingUp size={20} />}
                            label="Students"
                            value={String(adminStats.totalStudents)}
                            trend="Registered"
                            loading={loading}
                        />
                        <StatCard
                            icon={<Clock size={20} />}
                            label="Teachers"
                            value={String(adminStats.totalTeachers)}
                            trend="Active"
                            loading={loading}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <CardTitle>Today's Schedule</CardTitle>
                                    <CardDescription>Your AI-generated learning plan</CardDescription>
                                </div>
                                <Link
                                    to="/schedule"
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
                                ) : todaySchedule && todaySchedule.items.length > 0 ? (
                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        {todaySchedule.items.slice(0, 4).map((item) => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-3)',
                                                    padding: 'var(--space-2)',
                                                    marginBottom: 'var(--space-2)',
                                                    backgroundColor: item.completed ? 'var(--success-bg)' : 'var(--bg-secondary)',
                                                    borderRadius: '6px',
                                                    opacity: item.completed ? 0.7 : 1,
                                                }}
                                            >
                                                <div style={{
                                                    color: item.type === 'break' ? 'var(--text-muted)' :
                                                        item.type === 'personal' ? 'var(--warning)' : 'var(--accent)',
                                                }}>
                                                    {item.type === 'lesson' && <BookOpen size={16} />}
                                                    {item.type === 'break' && <Coffee size={16} />}
                                                    {item.type === 'personal' && <Target size={16} />}
                                                    {item.type === 'assignment' && <FileText size={16} />}
                                                    {item.type === 'review' && <RefreshCw size={16} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        fontSize: 'var(--text-sm)',
                                                        fontWeight: 'var(--font-medium)',
                                                        color: 'var(--text-primary)',
                                                        textDecoration: item.completed ? 'line-through' : 'none',
                                                    }}>
                                                        {item.title}
                                                    </p>
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        {item.startTime} - {item.endTime}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {todaySchedule.items.length > 4 && (
                                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-2)' }}>
                                                +{todaySchedule.items.length - 4} more items
                                            </p>
                                        )}
                                    </div>
                                ) : (
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
                                            No schedule for today.
                                            <br />
                                            <Link to="/schedule" style={{ color: 'var(--accent)' }}>Generate one now</Link>
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Continue Learning */}
                        <Card>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <CardTitle>Continue Learning</CardTitle>
                                    <CardDescription>Pick up where you left off</CardDescription>
                                </div>
                                <Link
                                    to="/my-courses"
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
                                ) : enrolledCourses.length > 0 ? (
                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        {enrolledCourses.slice(0, 3).map((course) => (
                                            <Link
                                                key={course.courseId}
                                                to={`/learn/${course.courseId}`}
                                                style={{
                                                    display: 'block',
                                                    padding: 'var(--space-3)',
                                                    marginBottom: 'var(--space-2)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    textDecoration: 'none',
                                                    borderRadius: '6px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                                    <p style={{
                                                        fontSize: 'var(--text-sm)',
                                                        fontWeight: 'var(--font-medium)',
                                                        color: 'var(--text-primary)',
                                                    }}>
                                                        {course.title}
                                                    </p>
                                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        {course.progress}%
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '4px',
                                                    backgroundColor: 'var(--border-default)',
                                                    borderRadius: '2px',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${course.progress}%`,
                                                        height: '100%',
                                                        backgroundColor: 'var(--accent)',
                                                        transition: 'width 0.3s ease',
                                                    }} />
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
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
                                            <Link to="/browse" style={{ color: 'var(--accent)' }}>Browse courses</Link>
                                        </p>
                                    </div>
                                )}
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
                                                        {courseEnrollmentCounts[course.id] || 0} students
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
                                ) : recentActivity.length > 0 ? (
                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        {recentActivity.map((activity, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-3)',
                                                    padding: 'var(--space-3)',
                                                    marginBottom: 'var(--space-2)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                }}
                                            >
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--accent-light)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--accent)',
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 'var(--font-semibold)',
                                                }}>
                                                    {activity.studentName.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        fontSize: 'var(--text-sm)',
                                                        fontWeight: 'var(--font-medium)',
                                                        color: 'var(--text-primary)',
                                                    }}>
                                                        {activity.studentName}
                                                    </p>
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        {activity.action} • {activity.courseName}
                                                    </p>
                                                </div>
                                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                    {activity.date.toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
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
                                )}
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
