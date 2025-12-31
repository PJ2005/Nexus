import { useState, useEffect } from 'react';
import {
    Target,
    Plus,
    Trash2,
    Check,
    Calendar,
    Trophy,
    TrendingUp,
    Clock,
    Repeat,
    Sparkles,
    Loader2,
} from 'lucide-react';
import { PageLayout } from '../../components/layout';
import { Card, CardTitle, CardDescription, CardContent, Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import {
    getSmartTasks,
    createSmartTask,
    updateSmartTask,
    deleteSmartTask,
    getRecurrenceLabel,
    getTimeOfDayLabel,
} from '../../services/taskService';
import type { SmartTask } from '../../types';

export function GoalsPage() {
    const { user } = useAuth();

    const [tasks, setTasks] = useState<SmartTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [adding, setAdding] = useState(false);
    const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (user) {
            loadTasks();
        }
    }, [user]);

    async function loadTasks() {
        if (!user) return;
        setLoading(true);
        try {
            const taskData = await getSmartTasks(user.uid);
            setTasks(taskData);
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddTask() {
        if (!user || !newTaskInput.trim()) return;
        setAdding(true);
        setAddResult(null);
        try {
            const { task, scheduledToday } = await createSmartTask(user.uid, newTaskInput.trim());
            setTasks([...tasks, task]);
            setNewTaskInput('');
            setAddResult({
                success: true,
                message: scheduledToday
                    ? `✅ "${task.title}" created and added to today's schedule!`
                    : `✅ "${task.title}" created! It will be scheduled automatically.`,
            });
        } catch (error) {
            console.error('Failed to add task:', error);
            setAddResult({ success: false, message: '❌ Failed to create task. Please try again.' });
        } finally {
            setAdding(false);
        }
    }

    async function handleToggleComplete(taskId: string, completed: boolean) {
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

    const activeTasks = tasks.filter(t => !t.archived && !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const recurringCount = activeTasks.filter(t => t.recurrence !== 'once').length;

    return (
        <PageLayout>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1 style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                }}>
                    My Tasks
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    Add tasks in natural language — they'll be auto-scheduled!
                </p>
            </div>

            {/* Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
            }}>
                <StatCard icon={<Target size={20} />} color="var(--accent)" value={activeTasks.length} label="Active Tasks" />
                <StatCard icon={<Repeat size={20} />} color="var(--warning)" value={recurringCount} label="Recurring" />
                <StatCard icon={<Trophy size={20} />} color="var(--success)" value={completedTasks.length} label="Completed" />
                <StatCard
                    icon={<TrendingUp size={20} />}
                    color="var(--accent)"
                    value={tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}
                    label="Progress"
                    suffix="%"
                />
            </div>

            {/* Add Task Form */}
            <Card style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                    <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                    <CardTitle>Add Smart Task</CardTitle>
                </div>
                <CardDescription>
                    Type naturally: "Go to gym everyday for 1hr in evening" or "Study math on weekdays at 4pm"
                </CardDescription>
                <CardContent>
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                placeholder="e.g., Practice piano for 30 mins every morning..."
                                value={newTaskInput}
                                onChange={(e) => setNewTaskInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            />
                        </div>
                        <Button onClick={handleAddTask} loading={adding} icon={<Plus size={16} />}>
                            Add Task
                        </Button>
                    </div>
                    {addResult && (
                        <p style={{
                            marginTop: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            borderRadius: '6px',
                            backgroundColor: addResult.success ? 'var(--success-bg)' : 'var(--error-bg)',
                            color: addResult.success ? 'var(--success)' : 'var(--error)',
                            fontSize: 'var(--text-sm)',
                        }}>
                            {addResult.message}
                        </p>
                    )}
                </CardContent>
            </Card>

            {loading ? (
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <Loader2 size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                    </div>
                </Card>
            ) : tasks.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <Target size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                            No tasks yet
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                            Add your first task above — try something like "Exercise for 30 mins daily in the morning"
                        </p>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    {/* Active Tasks */}
                    {activeTasks.length > 0 && (
                        <div>
                            <h2 style={{
                                fontSize: 'var(--text-lg)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-3)',
                            }}>
                                Active Tasks ({activeTasks.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {activeTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={handleToggleComplete}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                        <div>
                            <h2 style={{
                                fontSize: 'var(--text-lg)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-3)',
                            }}>
                                Completed ({completedTasks.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {completedTasks.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={handleToggleComplete}
                                        onDelete={handleDeleteTask}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </PageLayout>
    );
}

function StatCard({
    icon,
    color,
    value,
    label,
    suffix = '',
}: {
    icon: React.ReactNode;
    color: string;
    value: number;
    label: string;
    suffix?: string;
}) {
    return (
        <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color,
                }}>
                    {icon}
                </div>
                <div>
                    <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                        {value}{suffix}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label}</p>
                </div>
            </div>
        </Card>
    );
}

function TaskCard({
    task,
    onToggle,
    onDelete,
}: {
    task: SmartTask;
    onToggle: (id: string, completed: boolean) => void;
    onDelete: (id: string) => void;
}) {
    const isRecurring = task.recurrence !== 'once';

    return (
        <Card
            style={{
                opacity: task.completed ? 0.7 : 1,
                borderLeft: `3px solid ${task.completed ? 'var(--success)' : isRecurring ? 'var(--accent)' : 'var(--border-default)'}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <button
                    onClick={() => onToggle(task.id, !task.completed)}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: `2px solid ${task.completed ? 'var(--success)' : 'var(--border-default)'}`,
                        backgroundColor: task.completed ? 'var(--success)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                    }}
                >
                    {task.completed && <Check size={14} style={{ color: 'white' }} />}
                </button>

                <div style={{ flex: 1 }}>
                    <p style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: 'var(--font-medium)',
                        color: 'var(--text-primary)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        marginBottom: 'var(--space-1)',
                    }}>
                        {task.title}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {/* Duration */}
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            padding: '2px 8px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '4px',
                        }}>
                            <Clock size={12} />
                            {task.duration >= 60 ? `${Math.floor(task.duration / 60)}h${task.duration % 60 ? ` ${task.duration % 60}m` : ''}` : `${task.duration}m`}
                        </span>

                        {/* Time of Day */}
                        <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            padding: '2px 8px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '4px',
                        }}>
                            {getTimeOfDayLabel(task.preferredTime)}
                        </span>

                        {/* Recurrence */}
                        {isRecurring && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--accent)',
                                padding: '2px 8px',
                                backgroundColor: 'var(--accent-light)',
                                borderRadius: '4px',
                            }}>
                                <Repeat size={12} />
                                {getRecurrenceLabel(task.recurrence)}
                            </span>
                        )}

                        {/* Specific Time */}
                        {task.specificTime && (
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--text-muted)',
                                padding: '2px 8px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '4px',
                            }}>
                                <Calendar size={12} />
                                {task.specificTime}
                            </span>
                        )}
                    </div>

                    {/* Original Input (collapsed) */}
                    <p style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-muted)',
                        marginTop: 'var(--space-2)',
                        fontStyle: 'italic',
                    }}>
                        "{task.rawInput}"
                    </p>
                </div>

                <button
                    onClick={() => onDelete(task.id)}
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
        </Card>
    );
}
