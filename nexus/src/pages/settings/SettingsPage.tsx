import { useState, useEffect } from 'react';
import { User, Bell, Palette, Save, Check, Target, Calendar, Clock, Plus, X, Trash2 } from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, CardTitle, CardDescription, CardContent, Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import {
    getStudentProfile,
    saveStudentProfile,
    addGoal,
    updateGoal,
    deleteGoal,
    addConstraint,
    deleteConstraint,
    DEFAULT_PREFERENCES,
} from '../../services/scheduleService';
import type { Goal, Constraint, StudyPreferences, ConstraintRecurrence } from '../../types';

type SettingsTab = 'profile' | 'goals' | 'availability' | 'preferences' | 'notifications';

export function SettingsPage() {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    // Profile settings
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [bio, setBio] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    // Password settings
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Notifications
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [enrollmentAlerts, setEnrollmentAlerts] = useState(true);
    const [progressUpdates, setProgressUpdates] = useState(false);

    // Goals
    const [goals, setGoals] = useState<Goal[]>([]);
    const [newGoalText, setNewGoalText] = useState('');
    const [newGoalDate, setNewGoalDate] = useState('');
    const [goalsLoading, setGoalsLoading] = useState(false);

    // Constraints
    const [constraints, setConstraints] = useState<Constraint[]>([]);
    const [showConstraintModal, setShowConstraintModal] = useState(false);
    const [newConstraint, setNewConstraint] = useState({
        title: '',
        startTime: '09:00',
        endTime: '17:00',
        recurrence: 'weekly' as ConstraintRecurrence,
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    });

    // Preferences
    const [preferences, setPreferences] = useState<StudyPreferences>(DEFAULT_PREFERENCES);
    const [weeklyHoursTarget, setWeeklyHoursTarget] = useState(10);
    const [prefsSaving, setPrefsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            loadStudentData();
        }
    }, [user]);

    async function loadStudentData() {
        if (!user || user.role !== 'student') return;

        try {
            const profile = await getStudentProfile(user.uid);
            if (profile) {
                setGoals(profile.goals || []);
                setConstraints(profile.constraints || []);
                setPreferences(profile.preferences || DEFAULT_PREFERENCES);
                setWeeklyHoursTarget(profile.weeklyHoursTarget || 10);
            }
        } catch (error) {
            console.error('Failed to load student data:', error);
        }
    }

    async function handleSaveProfile() {
        if (!user) return;
        setProfileLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: displayName.trim(),
                bio: bio.trim(),
            });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 3000);
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setProfileLoading(false);
        }
    }

    async function handleChangePassword() {
        if (!user || !auth.currentUser) return;

        setPasswordError('');
        setPasswordSuccess(false);

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        setPasswordLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);

            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (error: unknown) {
            console.error('Failed to change password:', error);
            if (error instanceof Error && error.message.includes('wrong-password')) {
                setPasswordError('Current password is incorrect');
            } else {
                setPasswordError('Failed to change password. Please try again.');
            }
        } finally {
            setPasswordLoading(false);
        }
    }

    // Goals handlers
    async function handleAddGoal() {
        if (!user || !newGoalText.trim()) return;
        setGoalsLoading(true);
        try {
            const goal = await addGoal(user.uid, {
                description: newGoalText.trim(),
                targetDate: newGoalDate ? Timestamp.fromDate(new Date(newGoalDate)) : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                completed: false,
            });
            setGoals([...goals, goal]);
            setNewGoalText('');
            setNewGoalDate('');
        } catch (error) {
            console.error('Failed to add goal:', error);
        } finally {
            setGoalsLoading(false);
        }
    }

    async function handleToggleGoal(goalId: string, completed: boolean) {
        if (!user) return;
        try {
            await updateGoal(user.uid, goalId, { completed });
            setGoals(goals.map(g => g.id === goalId ? { ...g, completed } : g));
        } catch (error) {
            console.error('Failed to update goal:', error);
        }
    }

    async function handleDeleteGoal(goalId: string) {
        if (!user) return;
        try {
            await deleteGoal(user.uid, goalId);
            setGoals(goals.filter(g => g.id !== goalId));
        } catch (error) {
            console.error('Failed to delete goal:', error);
        }
    }

    // Constraints handlers
    async function handleAddConstraint() {
        if (!user || !newConstraint.title.trim()) return;
        try {
            const constraint = await addConstraint(user.uid, {
                title: newConstraint.title.trim(),
                startTime: newConstraint.startTime,
                endTime: newConstraint.endTime,
                recurrence: newConstraint.recurrence,
                daysOfWeek: newConstraint.recurrence === 'weekly' ? newConstraint.daysOfWeek : undefined,
            });
            setConstraints([...constraints, constraint]);
            setShowConstraintModal(false);
            setNewConstraint({
                title: '',
                startTime: '09:00',
                endTime: '17:00',
                recurrence: 'weekly',
                daysOfWeek: [1, 2, 3, 4, 5],
            });
        } catch (error) {
            console.error('Failed to add constraint:', error);
        }
    }

    async function handleDeleteConstraint(constraintId: string) {
        if (!user) return;
        try {
            await deleteConstraint(user.uid, constraintId);
            setConstraints(constraints.filter(c => c.id !== constraintId));
        } catch (error) {
            console.error('Failed to delete constraint:', error);
        }
    }

    // Preferences handlers
    async function handleSavePreferences() {
        if (!user) return;
        setPrefsSaving(true);
        try {
            await saveStudentProfile(user.uid, {
                preferences,
                weeklyHoursTarget,
            });
            setTimeout(() => setPrefsSaving(false), 1000);
        } catch (error) {
            console.error('Failed to save preferences:', error);
            setPrefsSaving(false);
        }
    }

    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; studentOnly?: boolean }[] = [
        { id: 'profile', label: 'Profile', icon: <User size={18} /> },
        { id: 'goals', label: 'Goals', icon: <Target size={18} />, studentOnly: true },
        { id: 'availability', label: 'Schedule', icon: <Calendar size={18} />, studentOnly: true },
        { id: 'preferences', label: 'Study Preferences', icon: <Clock size={18} />, studentOnly: true },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} /> },
    ];

    const filteredTabs = tabs.filter(tab => !tab.studentOnly || user?.role === 'student');

    return (
        <PageLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                        Settings
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        Manage your account and preferences
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                {/* Sidebar */}
                <div style={{ width: '220px', flexShrink: 0 }}>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        {filteredTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    padding: 'var(--space-3) var(--space-4)',
                                    background: activeTab === tab.id ? 'var(--accent-light)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: 'var(--text-sm)',
                                    fontWeight: activeTab === tab.id ? 'var(--font-medium)' : 'normal',
                                    color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* Theme Toggle */}
                    <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                            <Palette size={16} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Theme</span>
                        </div>
                        <Button variant="secondary" size="sm" onClick={toggleTheme} style={{ width: '100%' }}>
                            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                            <Card>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your personal information</CardDescription>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                        <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                                        <Input label="Email" value={user?.email || ''} disabled />
                                        <Input label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio about yourself" />
                                        <Button onClick={handleSaveProfile} loading={profileLoading} icon={profileSaved ? <Check size={16} /> : <Save size={16} />}>
                                            {profileSaved ? 'Saved!' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Change your password</CardDescription>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                        <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                        <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                        {passwordError && <p style={{ color: 'var(--error)', fontSize: 'var(--text-sm)' }}>{passwordError}</p>}
                                        {passwordSuccess && <p style={{ color: 'var(--success)', fontSize: 'var(--text-sm)' }}>Password changed successfully!</p>}
                                        <Button onClick={handleChangePassword} loading={passwordLoading} variant="secondary">
                                            Change Password
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Goals Tab */}
                    {activeTab === 'goals' && (
                        <Card>
                            <CardTitle>Learning Goals</CardTitle>
                            <CardDescription>Set your learning objectives to help the AI scheduler prioritize</CardDescription>
                            <CardContent>
                                {/* Add Goal Form */}
                                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                                    <div style={{ flex: 1 }}>
                                        <Input
                                            placeholder="e.g., Complete JavaScript course by end of month"
                                            value={newGoalText}
                                            onChange={(e) => setNewGoalText(e.target.value)}
                                        />
                                    </div>
                                    <input
                                        type="date"
                                        value={newGoalDate}
                                        onChange={(e) => setNewGoalDate(e.target.value)}
                                        style={{
                                            padding: 'var(--space-2) var(--space-3)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                    <Button onClick={handleAddGoal} loading={goalsLoading} icon={<Plus size={16} />}>
                                        Add Goal
                                    </Button>
                                </div>

                                {/* Goals List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    {goals.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-8)' }}>
                                            No goals yet. Add your first learning goal above!
                                        </p>
                                    ) : (
                                        goals.map((goal) => (
                                            <div
                                                key={goal.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-3)',
                                                    padding: 'var(--space-4)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    opacity: goal.completed ? 0.6 : 1,
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={goal.completed}
                                                    onChange={(e) => handleToggleGoal(goal.id, e.target.checked)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <p style={{
                                                        color: 'var(--text-primary)',
                                                        textDecoration: goal.completed ? 'line-through' : 'none',
                                                    }}>
                                                        {goal.description}
                                                    </p>
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                        Target: {goal.targetDate.toDate().toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteGoal(goal.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-muted)',
                                                        padding: 'var(--space-1)',
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Availability/Schedule Tab */}
                    {activeTab === 'availability' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                            <Card>
                                <CardTitle>Weekly Study Hours</CardTitle>
                                <CardDescription>Set your target study hours per week</CardDescription>
                                <CardContent>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                        <input
                                            type="range"
                                            min="1"
                                            max="40"
                                            value={weeklyHoursTarget}
                                            onChange={(e) => setWeeklyHoursTarget(Number(e.target.value))}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--accent)', minWidth: '80px' }}>
                                            {weeklyHoursTarget} hrs/wk
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                    <div>
                                        <CardTitle>Time Constraints</CardTitle>
                                        <CardDescription>Block times when you're unavailable (college, work, etc.)</CardDescription>
                                    </div>
                                    <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowConstraintModal(true)}>
                                        Add Constraint
                                    </Button>
                                </div>
                                <CardContent>
                                    {constraints.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>
                                            No constraints added. The AI will assume you're available all day.
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                            {constraints.map((constraint) => (
                                                <div
                                                    key={constraint.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: 'var(--space-3) var(--space-4)',
                                                        backgroundColor: 'var(--bg-secondary)',
                                                        borderRadius: '8px',
                                                        borderLeft: `3px solid ${constraint.color || 'var(--accent)'}`,
                                                    }}
                                                >
                                                    <div>
                                                        <p style={{ fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                                                            {constraint.title}
                                                        </p>
                                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                                            {constraint.startTime} - {constraint.endTime} • {constraint.recurrence}
                                                            {constraint.daysOfWeek && constraint.recurrence === 'weekly' && (
                                                                <> on {constraint.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteConstraint(constraint.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Study Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <Card>
                            <CardTitle>Study Preferences</CardTitle>
                            <CardDescription>Customize how the AI generates your schedule</CardDescription>
                            <CardContent>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-6)' }}>
                                    <div>
                                        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                                            Session Length (minutes)
                                        </label>
                                        <select
                                            value={preferences.preferredSessionLength}
                                            onChange={(e) => setPreferences({ ...preferences, preferredSessionLength: Number(e.target.value) })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '6px',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            <option value={25}>25 min (Pomodoro)</option>
                                            <option value={45}>45 min</option>
                                            <option value={60}>60 min</option>
                                            <option value={90}>90 min (Deep Work)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                                            Break Between Sessions
                                        </label>
                                        <select
                                            value={preferences.breakLength}
                                            onChange={(e) => setPreferences({ ...preferences, breakLength: Number(e.target.value) })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '6px',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            <option value={5}>5 min</option>
                                            <option value={10}>10 min</option>
                                            <option value={15}>15 min</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                                            Preferred Start Time
                                        </label>
                                        <input
                                            type="time"
                                            value={preferences.preferredStartTime}
                                            onChange={(e) => setPreferences({ ...preferences, preferredStartTime: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '6px',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>
                                            Preferred End Time
                                        </label>
                                        <input
                                            type="time"
                                            value={preferences.preferredEndTime}
                                            onChange={(e) => setPreferences({ ...preferences, preferredEndTime: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-3)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '6px',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: 'var(--space-6)' }}>
                                    <Button onClick={handleSavePreferences} loading={prefsSaving} icon={<Save size={16} />}>
                                        Save Preferences
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <Card>
                            <CardTitle>Notification Preferences</CardTitle>
                            <CardDescription>Choose what notifications you receive</CardDescription>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    {[
                                        { label: 'Email Notifications', desc: 'Receive updates via email', value: emailNotifications, setter: setEmailNotifications },
                                        { label: 'Enrollment Alerts', desc: 'Get notified when students enroll', value: enrollmentAlerts, setter: setEnrollmentAlerts },
                                        { label: 'Progress Updates', desc: 'Weekly progress summaries', value: progressUpdates, setter: setProgressUpdates },
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                            <div>
                                                <p style={{ color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{item.label}</p>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => item.setter(!item.value)}
                                                style={{
                                                    width: '44px',
                                                    height: '24px',
                                                    borderRadius: '12px',
                                                    backgroundColor: item.value ? 'var(--accent)' : 'var(--border-default)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'background-color 0.2s',
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'white',
                                                    position: 'absolute',
                                                    top: '3px',
                                                    left: item.value ? '23px' : '3px',
                                                    transition: 'left 0.2s',
                                                }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Constraint Modal */}
            {showConstraintModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '12px',
                        padding: 'var(--space-6)',
                        width: '400px',
                        maxWidth: '90vw',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                Add Time Constraint
                            </h3>
                            <button onClick={() => setShowConstraintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Input
                                label="Title"
                                placeholder="e.g., College Classes"
                                value={newConstraint.title}
                                onChange={(e) => setNewConstraint({ ...newConstraint, title: e.target.value })}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                <div>
                                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Start Time</label>
                                    <input
                                        type="time"
                                        value={newConstraint.startTime}
                                        onChange={(e) => setNewConstraint({ ...newConstraint, startTime: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>End Time</label>
                                    <input
                                        type="time"
                                        value={newConstraint.endTime}
                                        onChange={(e) => setNewConstraint({ ...newConstraint, endTime: e.target.value })}
                                        style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-1)' }}>Recurrence</label>
                                <select
                                    value={newConstraint.recurrence}
                                    onChange={(e) => setNewConstraint({ ...newConstraint, recurrence: e.target.value as ConstraintRecurrence })}
                                    style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                >
                                    <option value="once">One-time</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekdays">Weekdays only</option>
                                    <option value="weekends">Weekends only</option>
                                    <option value="weekly">Specific days</option>
                                </select>
                            </div>

                            {newConstraint.recurrence === 'weekly' && (
                                <div>
                                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>Days</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    const days = newConstraint.daysOfWeek.includes(idx)
                                                        ? newConstraint.daysOfWeek.filter(d => d !== idx)
                                                        : [...newConstraint.daysOfWeek, idx];
                                                    setNewConstraint({ ...newConstraint, daysOfWeek: days });
                                                }}
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    backgroundColor: newConstraint.daysOfWeek.includes(idx) ? 'var(--accent)' : 'var(--bg-secondary)',
                                                    color: newConstraint.daysOfWeek.includes(idx) ? 'white' : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 'var(--font-medium)',
                                                }}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                                <Button variant="secondary" onClick={() => setShowConstraintModal(false)} style={{ flex: 1 }}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddConstraint} style={{ flex: 1 }}>
                                    Add Constraint
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
