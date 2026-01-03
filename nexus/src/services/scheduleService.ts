import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    Timestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateScheduleWithAI, parseNaturalLanguageEdit } from '../lib/gemini';
import type {
    Schedule,
    ScheduleItem,
    Goal,
    Constraint,
    WeeklyAvailability,
    StudyPreferences,
    StudentScheduleProfile,
    Assignment,
    EnergyLevel,
} from '../types';
import { getCourse, getModules, getLessons } from './courseService';

// Default study preferences
export const DEFAULT_PREFERENCES: StudyPreferences = {
    preferredSessionLength: 45,
    breakLength: 10,
    longBreakAfter: 3,
    longBreakLength: 20,
    preferredStartTime: '09:00',
    preferredEndTime: '21:00',
    focusHours: ['10:00', '11:00', '15:00', '16:00'],
    avoidHours: ['12:00', '13:00'], // Lunch time
};

// Default availability (available most of the day)
export const DEFAULT_AVAILABILITY: WeeklyAvailability = {
    monday: [{ start: '09:00', end: '21:00' }],
    tuesday: [{ start: '09:00', end: '21:00' }],
    wednesday: [{ start: '09:00', end: '21:00' }],
    thursday: [{ start: '09:00', end: '21:00' }],
    friday: [{ start: '09:00', end: '21:00' }],
    saturday: [{ start: '10:00', end: '18:00' }],
    sunday: [{ start: '10:00', end: '18:00' }],
};

// ============ STUDENT PROFILE ============

export async function getStudentProfile(studentId: string): Promise<StudentScheduleProfile | null> {
    const docRef = doc(db, 'studentProfiles', studentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as StudentScheduleProfile;
    }
    return null;
}

export async function saveStudentProfile(
    studentId: string,
    profile: Partial<StudentScheduleProfile>
): Promise<void> {
    const docRef = doc(db, 'studentProfiles', studentId);
    await setDoc(docRef, profile, { merge: true });
}

// ============ GOALS ============

export async function getGoals(studentId: string): Promise<Goal[]> {
    const profile = await getStudentProfile(studentId);
    return profile?.goals || [];
}

export async function saveGoals(studentId: string, goals: Goal[]): Promise<void> {
    await saveStudentProfile(studentId, { goals });
}

export async function addGoal(studentId: string, goal: Omit<Goal, 'id'>): Promise<Goal> {
    const goals = await getGoals(studentId);
    const newGoal: Goal = {
        ...goal,
        id: crypto.randomUUID(),
    };
    goals.push(newGoal);
    await saveGoals(studentId, goals);
    return newGoal;
}

export async function updateGoal(studentId: string, goalId: string, updates: Partial<Goal>): Promise<void> {
    const goals = await getGoals(studentId);
    const index = goals.findIndex(g => g.id === goalId);
    if (index !== -1) {
        goals[index] = { ...goals[index], ...updates };
        await saveGoals(studentId, goals);
    }
}

export async function deleteGoal(studentId: string, goalId: string): Promise<void> {
    const goals = await getGoals(studentId);
    const filtered = goals.filter(g => g.id !== goalId);
    await saveGoals(studentId, filtered);
}

// ============ CONSTRAINTS ============

export async function getConstraints(studentId: string): Promise<Constraint[]> {
    const profile = await getStudentProfile(studentId);
    return profile?.constraints || [];
}

export async function saveConstraints(studentId: string, constraints: Constraint[]): Promise<void> {
    await saveStudentProfile(studentId, { constraints });
}

export async function addConstraint(studentId: string, constraint: Omit<Constraint, 'id' | 'createdAt'>): Promise<Constraint> {
    const constraints = await getConstraints(studentId);
    const newConstraint: Constraint = {
        ...constraint,
        id: crypto.randomUUID(),
        createdAt: Timestamp.now(),
    };
    constraints.push(newConstraint);
    await saveConstraints(studentId, constraints);
    return newConstraint;
}

export async function updateConstraint(studentId: string, constraintId: string, updates: Partial<Constraint>): Promise<void> {
    const constraints = await getConstraints(studentId);
    const index = constraints.findIndex(c => c.id === constraintId);
    if (index !== -1) {
        constraints[index] = { ...constraints[index], ...updates };
        await saveConstraints(studentId, constraints);
    }
}

export async function deleteConstraint(studentId: string, constraintId: string): Promise<void> {
    const constraints = await getConstraints(studentId);
    const filtered = constraints.filter(c => c.id !== constraintId);
    await saveConstraints(studentId, filtered);
}

// ============ AVAILABILITY & PREFERENCES ============

export async function getAvailability(studentId: string): Promise<WeeklyAvailability> {
    const profile = await getStudentProfile(studentId);
    return profile?.availability || DEFAULT_AVAILABILITY;
}

export async function saveAvailability(studentId: string, availability: WeeklyAvailability): Promise<void> {
    await saveStudentProfile(studentId, { availability });
}

export async function getPreferences(studentId: string): Promise<StudyPreferences> {
    const profile = await getStudentProfile(studentId);
    return profile?.preferences || DEFAULT_PREFERENCES;
}

export async function savePreferences(studentId: string, preferences: StudyPreferences): Promise<void> {
    await saveStudentProfile(studentId, { preferences });
}

// ============ SCHEDULE CRUD ============

export async function getSchedule(studentId: string, date: string): Promise<Schedule | null> {
    const schedulesQuery = query(
        collection(db, 'schedules'),
        where('studentId', '==', studentId),
        where('date', '==', date)
    );
    const snapshot = await getDocs(schedulesQuery);

    if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Schedule;
    }
    return null;
}

export async function getSchedulesInRange(
    studentId: string,
    startDate: string,
    endDate: string
): Promise<Schedule[]> {
    const schedulesQuery = query(
        collection(db, 'schedules'),
        where('studentId', '==', studentId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );
    const snapshot = await getDocs(schedulesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Schedule);
}

export async function saveSchedule(schedule: Omit<Schedule, 'id'> | Schedule): Promise<string> {
    // Check if schedule for this date already exists
    const existing = await getSchedule(schedule.studentId, schedule.date);

    // Strip id field if present (it might be passed as empty string from addTaskToTodaySchedule)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...scheduleData } = schedule as Schedule;

    if (existing && existing.id) {
        // Update existing - only if we have a valid id
        console.log('[saveSchedule] Updating existing schedule:', existing.id);
        await updateDoc(doc(db, 'schedules', existing.id), scheduleData);
        return existing.id;
    } else {
        // Create new
        console.log('[saveSchedule] Creating new schedule');
        const docRef = await addDoc(collection(db, 'schedules'), scheduleData);
        return docRef.id;
    }
}

export async function updateScheduleItem(
    scheduleId: string,
    itemId: string,
    updates: Partial<ScheduleItem>
): Promise<void> {
    if (!scheduleId) {
        console.warn('updateScheduleItem: No scheduleId provided');
        return;
    }
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleSnap = await getDoc(scheduleRef);

    if (scheduleSnap.exists()) {
        const schedule = scheduleSnap.data() as Schedule;
        const items = schedule.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        );

        // Recalculate completed minutes
        const completedMinutes = items
            .filter(item => item.completed && item.type !== 'break')
            .reduce((sum, item) => {
                const start = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
                const end = parseInt(item.endTime.split(':')[0]) * 60 + parseInt(item.endTime.split(':')[1]);
                return sum + (end - start);
            }, 0);

        await updateDoc(scheduleRef, { items, completedMinutes });
    }
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
    if (!scheduleId) {
        console.warn('deleteSchedule: No scheduleId provided');
        return;
    }
    await deleteDoc(doc(db, 'schedules', scheduleId));
}

// ============ STUDENT CONTEXT FOR AI ============

interface PendingLesson {
    courseId: string;
    courseTitle: string;
    moduleId: string;
    moduleTitle: string;
    lessonId: string;
    lessonTitle: string;
    estimatedMinutes: number;
}

interface PendingAssignment {
    id: string;
    courseId: string;
    courseTitle: string;
    title: string;
    dueDate: Date;
    priority: 'high' | 'medium' | 'low';
}

export interface StudentContext {
    goals: Goal[];
    constraints: Constraint[];
    availability: WeeklyAvailability;
    preferences: StudyPreferences;
    pendingLessons: PendingLesson[];
    pendingAssignments: PendingAssignment[];
    weeklyHoursTarget: number;
    completedLessonIds: Set<string>;
    academicLoad: 'light' | 'medium' | 'heavy';
    longTermContext: string[];
}

export async function getStudentContext(studentId: string): Promise<StudentContext> {
    // Get profile
    const profile = await getStudentProfile(studentId);

    // Get enrollments
    const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('studentId', '==', studentId)
    );
    const enrollmentsSnap = await getDocs(enrollmentsQuery);

    const completedLessonIds = new Set<string>();
    const pendingLessons: PendingLesson[] = [];
    const pendingAssignments: PendingAssignment[] = [];

    for (const enrollDoc of enrollmentsSnap.docs) {
        const enrollment = enrollDoc.data();
        const courseId = enrollment.courseId;

        // Track completed lessons
        (enrollment.completedLessons || []).forEach((id: string) => completedLessonIds.add(id));

        // Get course details
        const course = await getCourse(courseId);
        if (!course) continue;

        // Get modules and lessons
        const modules = await getModules(courseId);
        for (const mod of modules) {
            const lessons = await getLessons(courseId, mod.id);
            for (const lesson of lessons) {
                const lessonKey = `${mod.id}:${lesson.id}`;
                if (!completedLessonIds.has(lessonKey)) {
                    pendingLessons.push({
                        courseId,
                        courseTitle: course.title,
                        moduleId: mod.id,
                        moduleTitle: mod.title,
                        lessonId: lesson.id,
                        lessonTitle: lesson.title,
                        estimatedMinutes: lesson.estimatedMinutes || 30,
                    });
                }
            }
        }

        // Get pending assignments
        const assignmentsQuery = query(
            collection(db, 'courses', courseId, 'assignments'),
            where('dueDate', '>', Timestamp.now())
        );
        const assignmentsSnap = await getDocs(assignmentsQuery);
        for (const assignDoc of assignmentsSnap.docs) {
            const assignment = assignDoc.data() as Assignment;
            const dueDate = assignment.dueDate.toDate();
            const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            pendingAssignments.push({
                id: assignDoc.id,
                courseId,
                courseTitle: course.title,
                title: assignment.title,
                dueDate,
                priority: daysUntilDue <= 2 ? 'high' : daysUntilDue <= 5 ? 'medium' : 'low',
            });
        }
    }

    // Sort assignments by due date
    pendingAssignments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Calculate Academic Load (next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    let pendingMinutes = 0;

    // Sum lessons
    pendingLessons.forEach(l => pendingMinutes += l.estimatedMinutes);

    // Sum assignments due in next 7 days (approx 60 mins each if not specified)
    pendingAssignments
        .filter(a => a.dueDate <= next7Days)
        .forEach(() => pendingMinutes += 60);

    let academicLoad: 'light' | 'medium' | 'heavy' = 'medium';
    if (pendingMinutes < 120) academicLoad = 'light'; // < 2 hours
    else if (pendingMinutes > 300) academicLoad = 'heavy'; // > 5 hours

    // Generate Long Term Context (assignments due in 14 days)
    const next14Days = new Date();
    next14Days.setDate(next14Days.getDate() + 14);

    const longTermContext = pendingAssignments
        .filter(a => a.dueDate <= next14Days)
        .map(a => `[${a.dueDate.toLocaleDateString()}] ${a.title} (${a.courseTitle}) - Priority: ${a.priority}`);

    return {
        goals: profile?.goals || [],
        constraints: profile?.constraints || [],
        availability: profile?.availability || DEFAULT_AVAILABILITY,
        preferences: profile?.preferences || DEFAULT_PREFERENCES,
        pendingLessons,
        pendingAssignments,
        weeklyHoursTarget: profile?.weeklyHoursTarget || 10,
        completedLessonIds,
        academicLoad,
        longTermContext,
    };
}

// ============ AI SCHEDULE GENERATION ============

export async function generateSchedule(
    studentId: string,
    date: string,
    hoursAvailable?: number,
    energyLevel: EnergyLevel = 'medium'
): Promise<Schedule> {
    const context = await getStudentContext(studentId);

    // Determine available hours for the day
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek] as keyof WeeklyAvailability;
    const daySlots = context.availability[dayName];

    // Calculate available minutes from time slots
    let availableMinutes = 0;
    if (hoursAvailable) {
        availableMinutes = hoursAvailable * 60;
    } else {
        for (const slot of daySlots) {
            const startMins = parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
            const endMins = parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1]);
            availableMinutes += endMins - startMins;
        }
    }

    // Filter out blocked times from constraints
    const dayConstraints = context.constraints.filter(c => {
        if (c.recurrence === 'daily') return true;
        if (c.recurrence === 'weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
        if (c.recurrence === 'weekends' && (dayOfWeek === 0 || dayOfWeek === 6)) return true;
        if (c.recurrence === 'weekly' && c.daysOfWeek?.includes(dayOfWeek)) return true;
        if (c.recurrence === 'once' && c.date === date) return true;
        return false;
    });

    // Prepare personal tasks for AI
    const { getSmartTasks, shouldTaskRunOnDate } = await import('./taskService');
    const allTasks = await getSmartTasks(studentId);

    // Debug logging to trace task filtering
    console.log('[Schedule] All tasks for student:', allTasks.length);

    // Filter tasks for today
    const todaysTasks = allTasks.filter(t => {
        const isActive = !t.archived && !t.completed && t.autoSchedule;
        const shouldRun = shouldTaskRunOnDate(t, date);

        if (!isActive) {
            console.log(`[Schedule] Task "${t.title}" skipped: archived=${t.archived}, completed=${t.completed}, autoSchedule=${t.autoSchedule}`);
        } else if (!shouldRun) {
            console.log(`[Schedule] Task "${t.title}" skipped: shouldTaskRunOnDate returned false for date ${date}`);
        } else {
            console.log(`[Schedule] Task "${t.title}" INCLUDED for ${date}`);
        }

        return isActive && shouldRun;
    });

    console.log('[Schedule] Tasks to include for today:', todaysTasks.map(t => t.title));

    const personalTasksForAI = todaysTasks.map(t => ({
        id: t.id,
        title: t.title,
        duration: t.duration,
        preferredTime: t.preferredTime,
        specificTime: t.specificTime
    }));

    // Generate schedule using AI
    const items = await generateScheduleWithAI({
        date,
        availableMinutes,
        preferences: context.preferences,
        constraints: dayConstraints,
        timeSlots: daySlots,
        goals: context.goals.filter(g => !g.completed).map(g => g.description),
        pendingLessons: context.pendingLessons.slice(0, 10), // Limit to top 10
        pendingAssignments: context.pendingAssignments.slice(0, 5), // Limit to top 5
        energyLevel,
        academicLoad: context.academicLoad,
        longTermContext: context.longTermContext,
        personalTasks: personalTasksForAI,
    });

    // AI should have included the tasks. We can verify or add fallback logic here if needed, 
    // but for now we trust the AI or the fallback inside generateScheduleWithAI.

    // Sort all items by time
    items.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Calculate total minutes
    const totalMinutes = items
        .filter(item => item.type !== 'break')
        .reduce((sum, item) => {
            const start = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
            const end = parseInt(item.endTime.split(':')[0]) * 60 + parseInt(item.endTime.split(':')[1]);
            return sum + (end - start);
        }, 0);

    const schedule: Omit<Schedule, 'id'> = {
        studentId,
        date,
        generatedAt: Timestamp.now(),
        items,
        status: 'pending',
        totalMinutes,
        completedMinutes: 0,
        aiGenerated: true,
        editHistory: [],
    };

    const scheduleId = await saveSchedule(schedule);

    // Update last generated timestamp
    await saveStudentProfile(studentId, { lastScheduleGenerated: Timestamp.now() });

    return { id: scheduleId, ...schedule };
}

// ============ NATURAL LANGUAGE EDITING ============

export async function editScheduleWithNaturalLanguage(
    scheduleId: string,
    userInput: string
): Promise<{ success: boolean; message: string; schedule?: Schedule }> {
    if (!scheduleId) {
        return { success: false, message: 'No schedule ID provided' };
    }
    const scheduleRef = doc(db, 'schedules', scheduleId);
    const scheduleSnap = await getDoc(scheduleRef);

    if (!scheduleSnap.exists()) {
        return { success: false, message: 'Schedule not found' };
    }

    const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as Schedule;

    try {
        // Get student preferences for time constraints
        const profile = await getStudentProfile(schedule.studentId);
        const preferences = profile?.preferences || DEFAULT_PREFERENCES;

        // Use AI to parse the natural language command with time constraints
        const result = await parseNaturalLanguageEdit(userInput, schedule.items, {
            startTime: preferences.preferredStartTime,
            endTime: preferences.preferredEndTime,
        });

        if (!result.success) {
            return { success: false, message: result.message || 'Could not understand the request' };
        }

        // Apply the changes
        const updatedItems = result.updatedItems || schedule.items;

        // Add to edit history
        const editLog = {
            id: crypto.randomUUID(),
            timestamp: Timestamp.now(),
            userInput,
            action: result.action || 'Modified schedule',
            changes: result.changes || 'Schedule updated',
        };

        const editHistory = [...(schedule.editHistory || []), editLog];

        // Recalculate totals
        const totalMinutes = updatedItems
            .filter(item => item.type !== 'break')
            .reduce((sum, item) => {
                const start = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
                const end = parseInt(item.endTime.split(':')[0]) * 60 + parseInt(item.endTime.split(':')[1]);
                return sum + (end - start);
            }, 0);

        const completedMinutes = updatedItems
            .filter(item => item.completed && item.type !== 'break')
            .reduce((sum, item) => {
                const start = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
                const end = parseInt(item.endTime.split(':')[0]) * 60 + parseInt(item.endTime.split(':')[1]);
                return sum + (end - start);
            }, 0);

        await updateDoc(scheduleRef, {
            items: updatedItems,
            editHistory,
            totalMinutes,
            completedMinutes,
        });

        return {
            success: true,
            message: result.message || 'Schedule updated successfully',
            schedule: {
                ...schedule,
                items: updatedItems,
                editHistory,
                totalMinutes,
                completedMinutes,
            },
        };
    } catch (error) {
        console.error('Failed to edit schedule:', error);
        return { success: false, message: 'Failed to process the request' };
    }
}

// ============ UTILITY FUNCTIONS ============

export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
}

export function getDayName(date: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
}
