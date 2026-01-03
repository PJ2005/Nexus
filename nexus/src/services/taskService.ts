import {
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseSmartTaskInput } from '../lib/gemini';
import type { SmartTask, TimeOfDay, TaskRecurrence, ScheduleItem } from '../types';
import { getSchedule, saveSchedule, getDateString, getPreferences, getConstraints } from './scheduleService';

// ============ SMART TASK CRUD ============

export async function getSmartTasks(studentId: string): Promise<SmartTask[]> {
    const docRef = doc(db, 'studentTasks', studentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return (docSnap.data().tasks || []) as SmartTask[];
    }
    return [];
}

export async function saveSmartTasks(studentId: string, tasks: SmartTask[]): Promise<void> {
    const docRef = doc(db, 'studentTasks', studentId);
    // Clean each task to remove undefined values (Firestore doesn't accept undefined)
    const cleanedTasks = tasks.map(task => cleanForFirestore(task));
    await setDoc(docRef, { tasks: cleanedTasks }, { merge: true });
}

// Helper to clean undefined values for Firestore
function cleanForFirestore<T extends object>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    for (const key of Object.keys(obj) as (keyof T)[]) {
        if (obj[key] !== undefined) {
            cleaned[key] = obj[key];
        }
    }
    return cleaned;
}

export async function createSmartTask(
    studentId: string,
    rawInput: string
): Promise<{ task: SmartTask; scheduledToday: boolean }> {
    // Parse the natural language input using AI
    const parsed = await parseSmartTaskInput(rawInput);

    const task: SmartTask = {
        id: crypto.randomUUID(),
        rawInput,
        title: parsed.title,
        description: parsed.description,
        duration: parsed.duration,
        preferredTime: parsed.preferredTime,
        specificTime: parsed.specificTime,
        recurrence: parsed.recurrence,
        daysOfWeek: parsed.daysOfWeek,
        startDate: Timestamp.now(),
        endDate: parsed.endDate ? Timestamp.fromDate(new Date(parsed.endDate)) : undefined,
        completed: false,
        archived: false,
        createdAt: Timestamp.now(),
        autoSchedule: true,
    };

    // Save the task (clean undefined values for Firestore)
    const tasks = await getSmartTasks(studentId);
    tasks.push(task);
    await saveSmartTasks(studentId, tasks);

    // Try to add to today's schedule if applicable
    let scheduledToday = false;
    try {
        scheduledToday = await addTaskToTodaySchedule(studentId, task);
    } catch (err) {
        console.warn('Could not add to today schedule:', err);
    }

    return { task, scheduledToday };
}

export async function updateSmartTask(
    studentId: string,
    taskId: string,
    updates: Partial<SmartTask>
): Promise<void> {
    const tasks = await getSmartTasks(studentId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...updates };
        await saveSmartTasks(studentId, tasks);
    }
}

export async function deleteSmartTask(studentId: string, taskId: string): Promise<void> {
    const tasks = await getSmartTasks(studentId);
    const filtered = tasks.filter(t => t.id !== taskId);
    await saveSmartTasks(studentId, filtered);
}

export async function archiveSmartTask(studentId: string, taskId: string): Promise<void> {
    await updateSmartTask(studentId, taskId, { archived: true });
}

// ============ AUTO-SCHEDULING ============

export async function addTaskToTodaySchedule(
    studentId: string,
    task: SmartTask
): Promise<boolean> {
    const today = getDateString();

    // Check if task should run today based on recurrence
    if (!shouldTaskRunOnDate(task, today)) {
        return false;
    }

    // Get or create today's schedule
    let schedule = await getSchedule(studentId, today);

    if (!schedule) {
        // Create a minimal schedule if none exists
        schedule = {
            id: '',
            studentId,
            date: today,
            generatedAt: Timestamp.now(),
            items: [],
            status: 'pending',
            totalMinutes: 0,
            completedMinutes: 0,
            aiGenerated: false,
        };
    }

    // Find available slot for the task
    const slot = await findAvailableSlot(studentId, task, schedule.items, today);

    if (!slot) {
        return false; // No available slot found
    }

    // Create schedule item for this task
    const scheduleItem: ScheduleItem = {
        id: `task-${task.id}-${today}`,
        startTime: slot.start,
        endTime: slot.end,
        title: task.title,
        type: 'personal',
        taskId: task.id,
        completed: false,
        priority: 'medium',
    };

    // Only add description if it exists
    if (task.description) {
        scheduleItem.description = task.description;
    }

    // Add to schedule
    schedule.items.push(scheduleItem);
    schedule.items.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Recalculate total minutes
    schedule.totalMinutes = schedule.items
        .filter(item => item.type !== 'break')
        .reduce((sum, item) => {
            const [sh, sm] = item.startTime.split(':').map(Number);
            const [eh, em] = item.endTime.split(':').map(Number);
            return sum + (eh * 60 + em) - (sh * 60 + sm);
        }, 0);

    await saveSchedule(schedule);

    // Update task's last scheduled date
    await updateSmartTask(studentId, task.id, { lastScheduledDate: today });

    return true;
}

export function shouldTaskRunOnDate(task: SmartTask, date: string): boolean {
    // Parse date string (YYYY-MM-DD) correctly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // Local midnight
    const dayOfWeek = dateObj.getDay();

    const startDate = task.startDate.toDate();
    // Normalize startDate to local midnight for comparison
    const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    // Debug logging
    console.log(`[shouldTaskRunOnDate] Task "${task.title}":`, {
        inputDate: date,
        dateObj: dateObj.toISOString(),
        startDate: startDate.toISOString(),
        startDateNormalized: startDateNormalized.toISOString(),
        recurrence: task.recurrence,
        dayOfWeek,
        comparison: dateObj >= startDateNormalized ? 'OK' : 'BEFORE_START',
    });

    // Check if date is before start date
    if (dateObj < startDateNormalized) {
        console.log(`[shouldTaskRunOnDate] Task "${task.title}" FAILED: date before start`);
        return false;
    }

    // Check if date is after end date
    if (task.endDate) {
        const endDate = task.endDate.toDate();
        const endDateNormalized = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        if (dateObj > endDateNormalized) {
            console.log(`[shouldTaskRunOnDate] Task "${task.title}" FAILED: date after end`);
            return false;
        }
    }

    let result = false;
    switch (task.recurrence) {
        case 'once':
            // Only on the start date
            result = date === getDateString(startDate);
            break;
        case 'daily':
            result = true;
            break;
        case 'weekdays':
            result = dayOfWeek >= 1 && dayOfWeek <= 5;
            break;
        case 'weekends':
            result = dayOfWeek === 0 || dayOfWeek === 6;
            break;
        case 'weekly':
            // Same day of week as start date
            result = dayOfWeek === startDate.getDay();
            break;
        case 'custom':
            result = task.daysOfWeek?.includes(dayOfWeek) || false;
            break;
        default:
            result = false;
    }

    console.log(`[shouldTaskRunOnDate] Task "${task.title}" recurrence check: ${result}`);
    return result;
}

async function findAvailableSlot(
    studentId: string,
    task: SmartTask,
    existingItems: ScheduleItem[],
    date: string
): Promise<{ start: string; end: string } | null> {
    const preferences = await getPreferences(studentId);
    const constraints = await getConstraints(studentId);

    // Get time range based on preferred time of day
    const timeRange = getTimeRangeForPreference(task.preferredTime, preferences);

    // If specific time is set, try that first
    if (task.specificTime) {
        const endTime = addMinutes(task.specificTime, task.duration);
        if (isSlotAvailable(task.specificTime, endTime, existingItems, constraints, date)) {
            return { start: task.specificTime, end: endTime };
        }
    }

    // Try to find a slot in the preferred time range
    const slotSize = 15; // Try slots every 15 minutes
    let currentTime = timeRange.start;

    while (compareTime(currentTime, timeRange.end) < 0) {
        const endTime = addMinutes(currentTime, task.duration);

        // Don't exceed the time range
        if (compareTime(endTime, timeRange.end) > 0) {
            break;
        }

        if (isSlotAvailable(currentTime, endTime, existingItems, constraints, date)) {
            return { start: currentTime, end: endTime };
        }

        currentTime = addMinutes(currentTime, slotSize);
    }

    return null;
}

function getTimeRangeForPreference(
    preference: TimeOfDay,
    userPreferences: { preferredStartTime: string; preferredEndTime: string }
): { start: string; end: string } {
    switch (preference) {
        case 'morning':
            return { start: '06:00', end: '12:00' };
        case 'afternoon':
            return { start: '12:00', end: '17:00' };
        case 'evening':
            return { start: '17:00', end: '21:00' };
        case 'night':
            return { start: '21:00', end: '23:59' };
        case 'anytime':
        default:
            return {
                start: userPreferences.preferredStartTime,
                end: userPreferences.preferredEndTime,
            };
    }
}

function isSlotAvailable(
    startTime: string,
    endTime: string,
    existingItems: ScheduleItem[],
    constraints: { startTime: string; endTime: string }[],
    _date: string
): boolean {
    // Check against existing schedule items
    for (const item of existingItems) {
        if (timesOverlap(startTime, endTime, item.startTime, item.endTime)) {
            return false;
        }
    }

    // Check against constraints (simplified - should also check recurrence)
    for (const constraint of constraints) {
        if (timesOverlap(startTime, endTime, constraint.startTime, constraint.endTime)) {
            return false;
        }
    }

    return true;
}

function timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
): boolean {
    return compareTime(start1, end2) < 0 && compareTime(end1, start2) > 0;
}

// ============ DAILY TASK SYNC ============

export async function syncTasksToSchedule(studentId: string, date: string): Promise<number> {
    const tasks = await getSmartTasks(studentId);
    const activeTasks = tasks.filter(t => !t.archived && !t.completed && t.autoSchedule);

    let addedCount = 0;

    for (const task of activeTasks) {
        // Skip if already scheduled today
        if (task.lastScheduledDate === date) {
            continue;
        }

        // Check if task should run on this date
        if (!shouldTaskRunOnDate(task, date)) {
            continue;
        }

        const added = await addTaskToTodaySchedule(studentId, task);
        if (added) {
            addedCount++;
        }
    }

    return addedCount;
}

// ============ UTILITY FUNCTIONS ============

function addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

function compareTime(time1: string, time2: string): number {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h1 * 60 + m1) - (h2 * 60 + m2);
}

export function getRecurrenceLabel(recurrence: TaskRecurrence): string {
    switch (recurrence) {
        case 'once': return 'One time';
        case 'daily': return 'Every day';
        case 'weekdays': return 'Weekdays';
        case 'weekends': return 'Weekends';
        case 'weekly': return 'Weekly';
        case 'custom': return 'Custom';
        default: return recurrence;
    }
}

export function getTimeOfDayLabel(time: TimeOfDay): string {
    switch (time) {
        case 'morning': return '🌅 Morning (6am-12pm)';
        case 'afternoon': return '☀️ Afternoon (12pm-5pm)';
        case 'evening': return '🌆 Evening (5pm-9pm)';
        case 'night': return '🌙 Night (9pm-12am)';
        case 'anytime': return '⏰ Anytime';
        default: return time;
    }
}
