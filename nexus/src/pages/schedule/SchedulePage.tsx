import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Send,
    RefreshCw,
    Check,
    Clock,
    BookOpen,
    Coffee,
    FileText,
    Play,
    Loader2,
    Target,
    Settings,
    Plus,
    Trash2,
    Repeat,
    X,
    Battery,
} from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, CardTitle, CardDescription, CardContent, Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import {
    getSchedule,
    generateSchedule,
    updateScheduleItem,
    editScheduleWithNaturalLanguage,
    getDateString,
    getDayName,
    formatTime,
    getStudentProfile,
    saveStudentProfile,
    addConstraint,
    deleteConstraint,
    DEFAULT_PREFERENCES,
} from '../../services/scheduleService';
import {
    syncTasksToSchedule,
    getSmartTasks,
    createSmartTask,
    updateSmartTask,
    deleteSmartTask,
    getRecurrenceLabel,
    getTimeOfDayLabel,
} from '../../services/taskService';
import type { Schedule, ScheduleItem, SmartTask, Constraint, StudyPreferences, ConstraintRecurrence, EnergyLevel } from '../../types';

type ScheduleTab = 'today' | 'tasks' | 'preferences';

export function SchedulePage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Tab state
    const [activeTab, setActiveTab] = useState<ScheduleTab>('today');

    // Schedule state
    const [currentDate, setCurrentDate] = useState(getDateString());
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [nlInput, setNlInput] = useState('');
    const [nlProcessing, setNlProcessing] = useState(false);
    const [nlResponse, setNlResponse] = useState('');
    const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
    const [isOutdated, setIsOutdated] = useState(false);

    // Tasks state
    const [tasks, setTasks] = useState<SmartTask[]>([]);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [addingTask, setAddingTask] = useState(false);
    const [taskResult, setTaskResult] = useState<{ success: boolean; message: string } | null>(null);

    // Preferences state
    const [constraints, setConstraints] = useState<Constraint[]>([]);
    const [preferences, setPreferences] = useState<StudyPreferences>(DEFAULT_PREFERENCES);
    const [weeklyHours, setWeeklyHours] = useState(10);
    const [prefsSaving, setPrefsSaving] = useState(false);
    const [showConstraintModal, setShowConstraintModal] = useState(false);
    const [newConstraint, setNewConstraint] = useState({
        title: '',
        startTime: '09:00',
        endTime: '10:00',
        recurrence: 'weekly' as ConstraintRecurrence,
        daysOfWeek: [1] as number[],
    });

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    useEffect(() => {
        if (user && activeTab === 'today') {
            loadSchedule();
        }
    }, [user, currentDate, activeTab]);

    async function loadData() {
        if (!user) return;
        try {
            // Load profile data
            const profile = await getStudentProfile(user.uid);
            if (profile) {
                setConstraints(profile.constraints || []);
                setPreferences(profile.preferences || DEFAULT_PREFERENCES);
                setWeeklyHours(profile.weeklyHoursTarget || 10);

                // Check if schedule is outdated
                if (profile.lastTaskUpdate && profile.lastScheduleGenerated) {
                    setIsOutdated(profile.lastTaskUpdate.toMillis() > profile.lastScheduleGenerated.toMillis());
                }
            }

            // Load tasks
            const taskData = await getSmartTasks(user.uid);
            setTasks(taskData);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    async function loadSchedule() {
        if (!user) return;
        setLoading(true);
        try {
            const today = getDateString();
            if (currentDate === today) {
                try {
                    await syncTasksToSchedule(user.uid, today);
                } catch (err) {
                    console.warn('Task sync failed:', err);
                }
            }

            const scheduleData = await getSchedule(user.uid, currentDate);
            setSchedule(scheduleData);
        } catch (error) {
            console.error('Failed to load schedule:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerateSchedule() {
        if (!user) return;
        setGenerating(true);
        try {
            const newSchedule = await generateSchedule(user.uid, currentDate, undefined, energyLevel);
            setSchedule(newSchedule);
            setNlResponse('✨ Schedule generated with your tasks included!');
            setIsOutdated(false);
        } catch (error) {
            console.error('Failed to generate schedule:', error);
            setNlResponse('❌ Failed to generate schedule. Please try again.');
        } finally {
            setGenerating(false);
        }
    }

    async function handleToggleComplete(itemId: string, completed: boolean) {
        if (!schedule) return;
        try {
            await updateScheduleItem(schedule.id, itemId, { completed });
            setSchedule({
                ...schedule,
                items: schedule.items.map(item =>
                    item.id === itemId ? { ...item, completed } : item
                ),
            });
        } catch (error) {
            console.error('Failed to update item:', error);
        }
    }

    async function handleNaturalLanguageEdit() {
        if (!schedule || !nlInput.trim()) return;
        setNlProcessing(true);
        setNlResponse('');
        try {
            const result = await editScheduleWithNaturalLanguage(schedule.id, nlInput);
            if (result.success && result.schedule) {
                setSchedule(result.schedule);
                setNlResponse(`✅ ${result.message}`);
                setNlInput('');
            } else {
                setNlResponse(`⚠️ ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to edit schedule:', error);
            setNlResponse('❌ Something went wrong. Try a simpler command.');
        } finally {
            setNlProcessing(false);
        }
    }

    async function handleAddTask() {
        if (!user || !newTaskInput.trim()) return;
        setAddingTask(true);
        setTaskResult(null);
        try {
            const { task, scheduledToday } = await createSmartTask(user.uid, newTaskInput.trim());
            setTasks([...tasks, task]);
            setNewTaskInput('');
            setTaskResult({
                success: true,
                message: scheduledToday
                    ? `✅ "${task.title}" created and added to today's schedule!`
                    : `✅ "${task.title}" created!`,
            });
            // Reload schedule if on today tab
            if (activeTab === 'today' && currentDate === getDateString()) {
                await loadSchedule();
            }
        } catch (error) {
            console.error('Failed to add task:', error);
            setTaskResult({ success: false, message: '❌ Failed to create task.' });
        } finally {
            setAddingTask(false);
        }
    }

    async function handleToggleTask(taskId: string, completed: boolean) {
        if (!user) return;
        try {
            await updateSmartTask(user.uid, taskId, { completed });
            setTasks(tasks.map(t => t.id === taskId ? { ...t, completed } : t));
        } catch (error) {
            console.error('Failed to update task:', error);
        }
    }

    async function handleDeleteTask(taskId: string) {
        if (!user) return;
        try {
            await deleteSmartTask(user.uid, taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    }

    async function handleAddConstraint() {
        if (!user || !newConstraint.title.trim()) return;
        try {
            const constraint = await addConstraint(user.uid, {
                title: newConstraint.title,
                startTime: newConstraint.startTime,
                endTime: newConstraint.endTime,
                recurrence: newConstraint.recurrence,
                daysOfWeek: newConstraint.recurrence === 'weekly' ? newConstraint.daysOfWeek : undefined,
            });
            setConstraints([...constraints, constraint]);
            setShowConstraintModal(false);
            setNewConstraint({ title: '', startTime: '09:00', endTime: '10:00', recurrence: 'weekly', daysOfWeek: [1] });
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

    async function handleSavePreferences() {
        if (!user) return;
        setPrefsSaving(true);
        try {
            await saveStudentProfile(user.uid, {
                preferences,
                weeklyHoursTarget: weeklyHours,
            });
        } catch (error) {
            console.error('Failed to save preferences:', error);
        } finally {
            setPrefsSaving(false);
        }
    }

    function goToDate(offset: number) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + offset);
        setCurrentDate(getDateString(date));
    }

    function getItemIcon(type: ScheduleItem['type']) {
        switch (type) {
            case 'lesson': return <BookOpen size={16} />;
            case 'break': return <Coffee size={16} />;
            case 'assignment': return <FileText size={16} />;
            case 'review': return <RefreshCw size={16} />;
            default: return <Clock size={16} />;
        }
    }

    function getItemColor(type: ScheduleItem['type'], priority: ScheduleItem['priority']) {
        if (type === 'break') return 'var(--text-muted)';
        switch (priority) {
            case 'high': return 'var(--error)';
            case 'medium': return 'var(--accent)';
            case 'low': return 'var(--success)';
            default: return 'var(--text-secondary)';
        }
    }

    const isToday = currentDate === getDateString();
    const progressPercent = schedule
        ? Math.round((schedule.completedMinutes / Math.max(schedule.totalMinutes, 1)) * 100)
        : 0;

    const activeTasks = tasks.filter(t => !t.archived && !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const tabs: { id: ScheduleTab; label: string; icon: React.ReactNode }[] = [
        { id: 'today', label: 'Today', icon: <Calendar size={16} /> },
        { id: 'tasks', label: 'My Tasks', icon: <Target size={16} /> },
        { id: 'preferences', label: 'Preferences', icon: <Settings size={16} /> },
    ];

    return (
        <PageLayout>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                }}>
                    My Schedule
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    AI-powered scheduling with personal tasks
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-1)',
                marginBottom: 'var(--space-6)',
                borderBottom: '1px solid var(--border-default)',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-3) var(--space-4)',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: 'var(--text-sm)',
                            fontWeight: activeTab === tab.id ? 'var(--font-medium)' : 'var(--font-normal)',
                            color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                            marginBottom: '-1px',
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Today Tab */}
            {activeTab === 'today' && (
                <>
                    {/* Date Navigation + Generate Button */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <Card padding="sm" style={{ flex: 1, marginRight: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <button onClick={() => goToDate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <Calendar size={18} style={{ color: 'var(--accent)' }} />
                                        <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                                            {getDayName(currentDate)}, {new Date(currentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                        </span>
                                        {isToday && (
                                            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', backgroundColor: 'var(--accent)', color: 'white', borderRadius: '4px' }}>Today</span>
                                        )}
                                    </div>
                                    <button onClick={() => goToDate(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </Card>

                            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '4px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                                        <Battery size={14} />
                                        <span>Energy</span>
                                    </div>
                                    {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setEnergyLevel(level)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                fontSize: 'var(--text-xs)',
                                                fontWeight: 'var(--font-medium)',
                                                cursor: 'pointer',
                                                backgroundColor: energyLevel === level ? 'var(--accent)' : 'transparent',
                                                color: energyLevel === level ? 'white' : 'var(--text-secondary)',
                                                textTransform: 'capitalize',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                                <Button onClick={handleGenerateSchedule} loading={generating} icon={<Sparkles size={16} />}>
                                    {schedule ? 'Regenerate' : 'Generate'}
                                </Button>
                            </div>
                        </div>

                        {isOutdated && (
                            <div style={{
                                padding: 'var(--space-3)',
                                backgroundColor: 'var(--warning-bg)',
                                border: '1px solid var(--warning)',
                                borderRadius: '8px',
                                color: 'var(--warning-text)',
                                fontSize: 'var(--text-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                marginBottom: 'var(--space-4)'
                            }}>
                                <RefreshCw size={16} />
                                <span>Your tasks or goals have changed. Regenerate to update your schedule!</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
                        {/* Schedule */}
                        <div>
                            {loading ? (
                                <Card><div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}><Loader2 size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} /></div></Card>
                            ) : schedule ? (
                                <Card padding="none">
                                    <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Progress</span>
                                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{schedule.completedMinutes} / {schedule.totalMinutes} min ({progressPercent}%)</span>
                                        </div>
                                        <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? 'var(--success)' : 'var(--accent)', transition: 'width 0.3s ease' }} />
                                        </div>
                                    </div>
                                    <div style={{ padding: 'var(--space-2)' }}>
                                        {schedule.items.map((item, idx) => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', backgroundColor: item.completed ? 'var(--bg-secondary)' : 'transparent', borderRadius: '8px', opacity: item.completed ? 0.6 : 1, marginBottom: idx < schedule.items.length - 1 ? 'var(--space-1)' : 0 }}>
                                                <div style={{ width: '70px', flexShrink: 0, textAlign: 'right' }}>
                                                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{formatTime(item.startTime)}</span>
                                                    <br /><span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatTime(item.endTime)}</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getItemColor(item.type, item.priority) }} />
                                                    {idx < schedule.items.length - 1 && <div style={{ width: '2px', flex: 1, minHeight: '30px', backgroundColor: 'var(--border-subtle)' }} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                                        <span style={{ color: getItemColor(item.type, item.priority) }}>{getItemIcon(item.type)}</span>
                                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                                                    </div>
                                                    {item.type !== 'break' && (
                                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                            <button onClick={() => handleToggleComplete(item.id, !item.completed)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: 'var(--text-xs)', backgroundColor: item.completed ? 'var(--success-bg)' : 'var(--bg-tertiary)', color: item.completed ? 'var(--success)' : 'var(--text-secondary)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                {item.completed ? <Check size={12} /> : <Clock size={12} />}
                                                                {item.completed ? 'Done' : 'Complete'}
                                                            </button>
                                                            {item.courseId && item.lessonId && (
                                                                <button onClick={() => navigate(`/learn/${item.courseId}/${item.lessonId}`)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: 'var(--text-xs)', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                                    <Play size={12} /> Start
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ) : (
                                <Card>
                                    <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                                        <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>No schedule for this day</h3>
                                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>Generate an AI-powered schedule based on your tasks and courses.</p>
                                        <Button onClick={handleGenerateSchedule} loading={generating} icon={<Sparkles size={16} />}>Generate Schedule</Button>
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Card>
                                <CardTitle>Edit with AI</CardTitle>
                                <CardContent>
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>E.g., "Move gym to 5pm" or "Remove the 3pm break"</p>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <input type="text" value={nlInput} onChange={(e) => setNlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageEdit()} placeholder="Type a command..." disabled={!schedule || nlProcessing} style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }} />
                                        <button onClick={handleNaturalLanguageEdit} disabled={!schedule || !nlInput.trim() || nlProcessing} style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!schedule || !nlInput.trim() || nlProcessing) ? 0.5 : 1 }}>
                                            {nlProcessing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                                        </button>
                                    </div>
                                    {nlResponse && <p style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{nlResponse}</p>}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardTitle>Quick Add Task</CardTitle>
                                <CardContent>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <input type="text" value={newTaskInput} onChange={(e) => setNewTaskInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} placeholder='"Gym everyday 1hr evening"' disabled={addingTask} style={{ flex: 1, padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }} />
                                        <button onClick={handleAddTask} disabled={!newTaskInput.trim() || addingTask} style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', opacity: (!newTaskInput.trim() || addingTask) ? 0.5 : 1 }}>
                                            {addingTask ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                                        </button>
                                    </div>
                                    {taskResult && <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: taskResult.success ? 'var(--success)' : 'var(--error)' }}>{taskResult.message}</p>}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
                <div>
                    {/* Add Task */}
                    <Card style={{ marginBottom: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                            <CardTitle>Add Smart Task</CardTitle>
                        </div>
                        <CardDescription>Type naturally: "Go to gym everyday for 1hr in evening"</CardDescription>
                        <CardContent>
                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <Input placeholder="e.g., Practice piano 30 mins every morning..." value={newTaskInput} onChange={(e) => setNewTaskInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} style={{ flex: 1 }} />
                                <Button onClick={handleAddTask} loading={addingTask} icon={<Plus size={16} />}>Add Task</Button>
                            </div>
                            {taskResult && <p style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: '6px', backgroundColor: taskResult.success ? 'var(--success-bg)' : 'var(--error-bg)', color: taskResult.success ? 'var(--success)' : 'var(--error)', fontSize: 'var(--text-sm)' }}>{taskResult.message}</p>}
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                        <Card><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}><Target size={20} style={{ color: 'var(--accent)' }} /><div><p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{activeTasks.length}</p><p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Active</p></div></div></Card>
                        <Card><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}><Repeat size={20} style={{ color: 'var(--warning)' }} /><div><p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{activeTasks.filter(t => t.recurrence !== 'once').length}</p><p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Recurring</p></div></div></Card>
                        <Card><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}><Check size={20} style={{ color: 'var(--success)' }} /><div><p style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{completedTasks.length}</p><p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Completed</p></div></div></Card>
                    </div>

                    {/* Task List */}
                    {activeTasks.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Active Tasks ({activeTasks.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {activeTasks.map(task => (
                                    <TaskCard key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                                ))}
                            </div>
                        </div>
                    )}

                    {completedTasks.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>Completed ({completedTasks.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {completedTasks.map(task => (
                                    <TaskCard key={task.id} task={task} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
                                ))}
                            </div>
                        </div>
                    )}

                    {tasks.length === 0 && (
                        <Card><div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Target size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} /><h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>No tasks yet</h3><p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Add your first task above!</p></div></Card>
                    )}
                </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                    {/* Study Preferences */}
                    <Card>
                        <CardTitle>Study Preferences</CardTitle>
                        <CardDescription>Customize how your schedule is generated</CardDescription>
                        <CardContent>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Session Length (min)</label>
                                    <select value={preferences.preferredSessionLength} onChange={(e) => setPreferences({ ...preferences, preferredSessionLength: Number(e.target.value) })} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                        <option value={25}>25 min (Pomodoro)</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                        <option value={90}>90 min (Deep work)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Break Length (min)</label>
                                    <input type="number" value={preferences.breakLength} onChange={(e) => setPreferences({ ...preferences, breakLength: Number(e.target.value) })} min={5} max={30} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Start Time</label>
                                        <input type="time" value={preferences.preferredStartTime} onChange={(e) => setPreferences({ ...preferences, preferredStartTime: e.target.value })} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>End Time</label>
                                        <input type="time" value={preferences.preferredEndTime} onChange={(e) => setPreferences({ ...preferences, preferredEndTime: e.target.value })} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Weekly Study Hours Target</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        <input type="range" min={5} max={40} value={weeklyHours} onChange={(e) => setWeeklyHours(Number(e.target.value))} style={{ flex: 1 }} />
                                        <span style={{ minWidth: '60px', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{weeklyHours} hrs</span>
                                    </div>
                                </div>
                                <Button onClick={handleSavePreferences} loading={prefsSaving} icon={<Check size={16} />}>Save Preferences</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Constraints */}
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                            <CardTitle>Time Constraints</CardTitle>
                            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowConstraintModal(true)}>Add</Button>
                        </div>
                        <CardDescription>Block times when you're unavailable (classes, work)</CardDescription>
                        <CardContent>
                            {constraints.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    {constraints.map(c => (
                                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                            <div>
                                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>{c.title}</p>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{formatTime(c.startTime)} - {formatTime(c.endTime)} • {c.recurrence}</p>
                                            </div>
                                            <button onClick={() => handleDeleteConstraint(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 'var(--space-1)' }}><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>No constraints set</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Constraint Modal */}
            {showConstraintModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <Card style={{ width: '400px', maxWidth: '90vw' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <CardTitle>Add Constraint</CardTitle>
                            <button onClick={() => setShowConstraintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Input label="Title" placeholder="e.g., Morning classes" value={newConstraint.title} onChange={(e) => setNewConstraint({ ...newConstraint, title: e.target.value })} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Start</label>
                                    <input type="time" value={newConstraint.startTime} onChange={(e) => setNewConstraint({ ...newConstraint, startTime: e.target.value })} style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>End</label>
                                    <input type="time" value={newConstraint.endTime} onChange={(e) => setNewConstraint({ ...newConstraint, endTime: e.target.value })} style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Recurrence</label>
                                <select value={newConstraint.recurrence} onChange={(e) => setNewConstraint({ ...newConstraint, recurrence: e.target.value as ConstraintRecurrence })} style={{ width: '100%', padding: 'var(--space-2)', border: '1px solid var(--border-default)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                    <option value="daily">Daily</option>
                                    <option value="weekdays">Weekdays</option>
                                    <option value="weekends">Weekends</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="once">One-time</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                <Button variant="secondary" onClick={() => setShowConstraintModal(false)}>Cancel</Button>
                                <Button onClick={handleAddConstraint} disabled={!newConstraint.title.trim()}>Add Constraint</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </PageLayout>
    );
}

function TaskCard({ task, onToggle, onDelete }: { task: SmartTask; onToggle: (id: string, completed: boolean) => void; onDelete: (id: string) => void }) {
    const isRecurring = task.recurrence !== 'once';
    return (
        <Card style={{ opacity: task.completed ? 0.7 : 1, borderLeft: `3px solid ${task.completed ? 'var(--success)' : isRecurring ? 'var(--accent)' : 'var(--border-default)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <button onClick={() => onToggle(task.id, !task.completed)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${task.completed ? 'var(--success)' : 'var(--border-default)'}`, backgroundColor: task.completed ? 'var(--success)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    {task.completed && <Check size={12} style={{ color: 'white' }} />}
                </button>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none', marginBottom: 'var(--space-1)' }}>{task.title}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: '2px 6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}><Clock size={10} />{task.duration >= 60 ? `${Math.floor(task.duration / 60)}h` : `${task.duration}m`}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', padding: '2px 6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>{getTimeOfDayLabel(task.preferredTime)}</span>
                        {isRecurring && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--accent)', padding: '2px 6px', backgroundColor: 'var(--accent-light)', borderRadius: '4px' }}><Repeat size={10} />{getRecurrenceLabel(task.recurrence)}</span>}
                    </div>
                </div>
                <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 'var(--space-1)' }}><Trash2 size={16} /></button>
            </div>
        </Card>
    );
}
