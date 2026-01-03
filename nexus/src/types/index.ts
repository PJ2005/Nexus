import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'admin' | 'teacher' | 'student';

// User document
export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: UserRole;
    createdAt: Timestamp;
    updatedAt: Timestamp;

    // Student-specific fields
    goals?: Goal[];
    availability?: WeeklyAvailability;
    weeklyHoursTarget?: number;
}

// Legacy Goal interface (kept for backward compatibility)
export interface Goal {
    id: string;
    description: string;
    targetDate: Timestamp;
    completed: boolean;
}

// Smart Task - Todoist-like task with recurrence and auto-scheduling
export type TaskRecurrence = 'once' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';

export interface SmartTask {
    id: string;
    rawInput: string; // Original natural language input
    title: string; // Parsed title
    description?: string;

    // Scheduling
    duration: number; // Minutes
    preferredTime: TimeOfDay;
    specificTime?: string; // HH:MM if user specified exact time

    // Recurrence
    recurrence: TaskRecurrence;
    daysOfWeek?: number[]; // 0-6 for custom recurrence
    startDate: Timestamp;
    endDate?: Timestamp; // Optional end date for recurring tasks

    // Status
    completed: boolean;
    archived: boolean;
    createdAt: Timestamp;

    // Auto-scheduling
    autoSchedule: boolean; // If true, automatically adds to daily schedules
    lastScheduledDate?: string; // YYYY-MM-DD of last auto-scheduled
}

export interface TimeSlot {
    start: string; // HH:MM format
    end: string;
}

export interface WeeklyAvailability {
    monday: TimeSlot[];
    tuesday: TimeSlot[];
    wednesday: TimeSlot[];
    thursday: TimeSlot[];
    friday: TimeSlot[];
    saturday: TimeSlot[];
    sunday: TimeSlot[];
}

// Course status
export type CourseStatus = 'draft' | 'published' | 'archived';

// Course document
export interface Course {
    id: string;
    title: string;
    description: string;
    coverImage?: string;
    teacherId: string;
    teacherName: string;
    status: CourseStatus;
    enrolledCount: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Module document (subcollection of Course)
export interface Module {
    id: string;
    title: string;
    description: string;
    order: number;
    estimatedMinutes: number;
}

// Lesson document (subcollection of Module)
export interface Lesson {
    id: string;
    title: string;
    content: string;
    documentIds: string[];
    attachments?: MaterialAttachment[];
    estimatedMinutes: number;
    order: number;
}

// Enrollment document
export interface Enrollment {
    id: string;
    courseId: string;
    studentId: string;
    enrolledAt: Timestamp;
    progress: EnrollmentProgress;
}

export interface EnrollmentProgress {
    completedLessons: string[];
    lastAccessedAt: Timestamp;
}

// Schedule document
export type ScheduleStatus = 'pending' | 'in_progress' | 'completed';

export interface Schedule {
    id: string;
    studentId: string;
    date: string; // YYYY-MM-DD format
    generatedAt: Timestamp;
    items: ScheduleItem[];
    status: ScheduleStatus;
    // AI metadata
    totalMinutes: number;
    completedMinutes: number;
    aiGenerated: boolean;
    editHistory?: ScheduleEditLog[];
}

export interface ScheduleItem {
    id: string;
    courseId?: string; // Optional for breaks/events
    lessonId?: string;
    assignmentId?: string;
    taskId?: string;
    startTime: string; // HH:MM format
    endTime: string;
    title: string;
    description?: string;
    type: 'lesson' | 'break' | 'assignment' | 'review' | 'event' | 'personal';
    completed: boolean;
    priority: 'high' | 'medium' | 'low';
}

export interface ScheduleEditLog {
    id: string;
    timestamp: Timestamp;
    userInput: string; // Natural language input
    action: string; // Parsed action description
    changes: string; // Summary of changes made
}

// Constraint types for blocking time
export type ConstraintRecurrence = 'once' | 'daily' | 'weekly' | 'weekdays' | 'weekends';

export interface Constraint {
    id: string;
    title: string;
    description?: string;
    startTime: string; // HH:MM format
    endTime: string;
    recurrence: ConstraintRecurrence;
    // For weekly recurrence
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    // For one-time events
    date?: string; // YYYY-MM-DD format
    color?: string;
    createdAt: Timestamp;
}

// Study preferences
export interface StudyPreferences {
    preferredSessionLength: number; // minutes (e.g., 25, 45, 60)
    breakLength: number; // minutes between sessions
    longBreakAfter: number; // sessions before long break
    longBreakLength: number; // minutes
    preferredStartTime: string; // HH:MM - when student prefers to start
    preferredEndTime: string; // HH:MM - when student prefers to end
    focusHours: string[]; // HH:MM times when student is most focused
    avoidHours: string[]; // HH:MM times to avoid scheduling
}

export type EnergyLevel = 'high' | 'medium' | 'low';

// Schedule history for pattern learning
export interface StudySession {
    id: string;
    studentId: string;
    scheduleId: string;
    scheduleItemId: string;
    courseId?: string;
    lessonId?: string;
    plannedStart: string;
    plannedEnd: string;
    actualStart?: Timestamp;
    actualEnd?: Timestamp;
    completed: boolean;
    // Feedback for learning
    difficulty?: 'easy' | 'medium' | 'hard';
    focusRating?: number; // 1-5
    notes?: string;
}

// Student profile extensions
export interface StudentScheduleProfile {
    goals: Goal[];
    constraints: Constraint[];
    availability: WeeklyAvailability;
    preferences: StudyPreferences;
    weeklyHoursTarget: number;
    lastScheduleGenerated?: Timestamp;
    lastTaskUpdate?: Timestamp;
}


// Auth context types
export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

// Quiz/MCQ types
export interface Quiz {
    id: string;
    courseId: string;
    moduleId?: string;
    lessonId?: string;
    title: string;
    description: string;
    questions: QuizQuestion[];
    timeLimit?: number; // in minutes
    passingScore: number; // percentage
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
    points: number;
}

export interface QuizAttempt {
    id: string;
    quizId: string;
    studentId: string;
    answers: number[]; // index of selected options
    score: number;
    passed: boolean;
    startedAt: Timestamp;
    completedAt: Timestamp;
}

// Assignment types
export interface Assignment {
    id: string;
    courseId: string;
    moduleId?: string;
    title: string;
    description: string;
    instructions: string;
    dueDate: Timestamp;
    maxScore: number;
    attachments: MaterialAttachment[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface AssignmentSubmission {
    id: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    attachments: MaterialAttachment[];
    submittedAt: Timestamp;
    score?: number;
    feedback?: string;
    gradedAt?: Timestamp;
}

// Material/Document types
export interface MaterialAttachment {
    id: string;
    name: string;
    url: string;
    type: string; // mime type
    size: number; // bytes
    uploadedAt: Timestamp;
}

export interface CourseMaterial {
    id: string;
    courseId: string;
    moduleId?: string;
    lessonId?: string;
    title: string;
    description?: string;
    attachment: MaterialAttachment;
    createdAt: Timestamp;
}

// Extended Lesson type with content types
export type LessonContentType = 'text' | 'video' | 'document' | 'quiz';

export interface LessonContent {
    type: LessonContentType;
    data: string; // text content, video URL, document ID, or quiz ID
}
