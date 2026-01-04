import { GoogleGenAI } from '@google/genai';
import type { ScheduleItem, Constraint, StudyPreferences, TimeSlot, EnergyLevel } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn('Missing Gemini API key - AI features will be disabled');
}

export const genai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Model configuration
export const MODELS = {
    FLASH: 'models/gemini-flash-lite-latest',
    PRO: 'models/gemini-flash-latest',
} as const;

// Generate content with context (for RAG)
export async function generateWithContext(
    prompt: string,
    context: string,
    model: string = MODELS.FLASH
): Promise<string> {
    if (!genai) return '';

    const systemPrompt = `You are an intelligent learning assistant for an LMS platform. 
Use the following context from course materials to help answer questions and generate schedules.

Context:
${context}

Now respond to the user's request:`;

    const response = await genai.models.generateContent({
        model,
        contents: `${systemPrompt}\n\n${prompt}`,
    });

    return response.text || '';
}

// ============ SCHEDULE GENERATION ============

interface ScheduleGenerationParams {
    date: string;
    availableMinutes: number;
    preferences: StudyPreferences;
    constraints: Constraint[];
    timeSlots: TimeSlot[];
    goals: string[];
    pendingLessons: {
        courseId: string;
        courseTitle: string;
        moduleId: string;
        lessonId: string;
        lessonTitle: string;
        estimatedMinutes: number;
    }[];
    pendingAssignments: {
        id: string;
        courseId: string;
        courseTitle: string;
        title: string;
        dueDate: Date;
        priority: 'high' | 'medium' | 'low';
    }[];
    energyLevel: EnergyLevel;
    academicLoad: 'light' | 'medium' | 'heavy';
    longTermContext: string[]; // Assignments/Lessons due in next 14 days
    personalTasks: {
        id: string;
        title: string;
        duration: number;
        preferredTime: string;
        specificTime?: string;
    }[];
}

export async function generateScheduleWithAI(params: ScheduleGenerationParams): Promise<ScheduleItem[]> {
    if (!genai) {
        // Fallback: generate simple schedule without AI
        return generateFallbackSchedule(params);
    }

    const prompt = `You are a smart learning schedule optimizer. Generate an optimized daily study schedule.

DATE: ${params.date}
AVAILABLE TIME: ${params.availableMinutes} minutes total
STUDY PREFERENCES:
- Session length: ${params.preferences.preferredSessionLength} minutes
- Break between sessions: ${params.preferences.breakLength} minutes
- Long break after every ${params.preferences.longBreakAfter} sessions (${params.preferences.longBreakLength} min)
- Preferred start: ${params.preferences.preferredStartTime}
- Preferred end: ${params.preferences.preferredEndTime}
- Focus hours: ${params.preferences.focusHours.join(', ')}
- Avoid hours: ${params.preferences.avoidHours.join(', ')}

TIME DEFINITIONS (Use these strictly):
- Morning: 06:00 - 12:00
- Afternoon: 12:00 - 17:00
- Evening: 17:00 - 21:00
- Night: 21:00 - 00:00

AVAILABLE TIME SLOTS:
${params.timeSlots.map(s => `${s.start} - ${s.end}`).join('\n')}

BLOCKED TIMES (constraints):
${params.constraints.map(c => `${c.startTime} - ${c.endTime}: ${c.title}`).join('\n') || 'None'}

MANDATORY PERSONAL TASKS (Must be included):
${params.personalTasks.map(t => `- [${t.title}] (${t.duration} min) ${t.specificTime ? `MUST BE @ ${t.specificTime}` : `PREFER: ${t.preferredTime}`} (ID: ${t.id})`).join('\n') || 'None'}

STUDENT GOALS:
${params.goals.map(g => `- ${g}`).join('\n') || 'General learning'}

PENDING LESSONS (prioritize earlier ones):
${params.pendingLessons.map((l, i) => `${i + 1}. [${l.courseTitle}] ${l.lessonTitle} (${l.estimatedMinutes} min) - courseId: ${l.courseId}, lessonId: ${l.lessonId}`).join('\n') || 'None'}

PENDING ASSIGNMENTS (prioritize by due date):
${params.pendingAssignments.map(a => `- [${a.priority.toUpperCase()}] ${a.title} from ${a.courseTitle} (Due: ${a.dueDate.toLocaleDateString()}) - id: ${a.id}, courseId: ${a.courseId}`).join('\n') || 'None'}

Create an optimized schedule that:
1. **CRITICAL**: Schedule ALL MANDATORY PERSONAL TASKS first.
   - If a specific time is set (e.g., "MUST BE @ 19:00"), YOU MUST schedule it exactly there. Shift other items around it.
   - If a preference is set (e.g., "PREFER: evening"), place it strictly within the defined time range (e.g., 17:00-21:00).
2. Respects the available time slots and avoids blocked times.
3. Includes regular breaks following the Pomodoro-style preferences.
4. **CRITICAL**: ONLY create "lesson" type items for lessons that are EXPLICITLY listed in the PENDING LESSONS section above. Each lesson item MUST use the exact courseId and lessonId from that list. Do NOT invent or generate any generic "study session", "learning session", or similar items.
5. **CRITICAL**: ONLY create "assignment" type items for assignments that are EXPLICITLY listed in the PENDING ASSIGNMENTS section above. Each assignment item MUST use the exact id and courseId from that list.
6. **CRITICAL**: If PENDING LESSONS shows "None", generate ZERO lesson items. If PENDING ASSIGNMENTS shows "None", generate ZERO assignment items. Only include personal tasks and breaks in this case.
7. Prioritizes high-priority items during focus hours.
8. Balances variety - don't schedule the same course consecutively if possible.
9. Includes a long break after every ${params.preferences.longBreakAfter} sessions.

Return ONLY a valid JSON array with NO additional text, markdown, or explanation. Each object must have:
{
  "id": "unique-uuid-string",
  "startTime": "HH:MM",
  "endTime": "HH:MM", 
  "title": "descriptive title (MUST be from the PENDING LESSONS/ASSIGNMENTS lists, never generic)",
  "description": "brief description",
  "type": "lesson" | "break" | "assignment" | "review" | "personal",
  "courseId": "course-id or null (MUST match the provided courseId for lessons/assignments)",
  "lessonId": "lesson-id or null (MUST match the provided lessonId for lessons)",
  "assignmentId": "assignment-id or null (MUST match the provided id for assignments)",
  "taskId": "task-id or null (for personal tasks)",
  "completed": false,
  "priority": "high" | "medium" | "low"
}`;

    try {
        const response = await genai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
        });

        const text = response.text || '[]';

        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        // Try to find JSON array in the response
        const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            jsonStr = arrayMatch[0];
        }

        let items = JSON.parse(jsonStr) as ScheduleItem[];

        // Validate and fix items
        items = items.map(item => ({
            ...item,
            id: item.id || crypto.randomUUID(),
            completed: false,
            priority: item.priority || 'medium',
            type: item.type || 'lesson',
        }));

        // POST-GENERATION VALIDATION: Inject missing personal tasks
        if (params.personalTasks && params.personalTasks.length > 0) {
            const scheduledTaskIds = new Set(items.filter(i => i.taskId).map(i => i.taskId));

            for (const task of params.personalTasks) {
                if (!scheduledTaskIds.has(task.id)) {
                    // This task was not scheduled by AI - inject it
                    console.warn(`AI missed personal task: ${task.title}, injecting...`);

                    let taskStartTime: string;
                    if (task.specificTime) {
                        taskStartTime = task.specificTime;
                    } else {
                        // Use preferred time range
                        switch (task.preferredTime) {
                            case 'morning': taskStartTime = '08:00'; break;
                            case 'afternoon': taskStartTime = '14:00'; break;
                            case 'evening': taskStartTime = '18:00'; break;
                            case 'night': taskStartTime = '21:00'; break;
                            default: taskStartTime = '10:00';
                        }
                    }

                    const taskEndTime = addMinutes(taskStartTime, task.duration);

                    items.push({
                        id: crypto.randomUUID(),
                        startTime: taskStartTime,
                        endTime: taskEndTime,
                        title: task.title,
                        description: 'Personal task',
                        type: 'personal',
                        taskId: task.id,
                        completed: false,
                        priority: 'medium',
                    });
                }
            }

            // Re-sort after injection
            items.sort((a, b) => compareTime(a.startTime, b.startTime));
        }

        return items;
    } catch (error) {
        console.error('Failed to generate schedule with AI:', error);
        return generateFallbackSchedule(params);
    }
}

function generateFallbackSchedule(params: ScheduleGenerationParams): ScheduleItem[] {
    const items: ScheduleItem[] = [];
    let currentTime = params.preferences.preferredStartTime;
    let sessionCount = 0;

    // Helper to get time range for preferred time of day
    const getTimeRange = (preferredTime: string): { start: string; end: string } => {
        switch (preferredTime) {
            case 'morning': return { start: '06:00', end: '12:00' };
            case 'afternoon': return { start: '12:00', end: '17:00' };
            case 'evening': return { start: '17:00', end: '21:00' };
            case 'night': return { start: '21:00', end: '23:59' };
            default: return { start: params.preferences.preferredStartTime, end: params.preferences.preferredEndTime };
        }
    };

    // FIRST: Schedule all personal tasks
    if (params.personalTasks && params.personalTasks.length > 0) {
        for (const task of params.personalTasks) {
            let taskStartTime: string;

            if (task.specificTime) {
                taskStartTime = task.specificTime;
            } else {
                const range = getTimeRange(task.preferredTime);
                taskStartTime = range.start;
            }

            const taskEndTime = addMinutes(taskStartTime, task.duration);

            items.push({
                id: crypto.randomUUID(),
                startTime: taskStartTime,
                endTime: taskEndTime,
                title: task.title,
                description: 'Personal task',
                type: 'personal',
                taskId: task.id,
                completed: false,
                priority: 'medium',
            });
        }
    }

    // Sort personal tasks by start time
    items.sort((a, b) => compareTime(a.startTime, b.startTime));

    // Helper to check if a time slot overlaps with existing items
    const isSlotFree = (start: string, end: string): boolean => {
        for (const item of items) {
            if (compareTime(start, item.endTime) < 0 && compareTime(end, item.startTime) > 0) {
                return false;
            }
        }
        return true;
    };

    // SECOND: Schedule lessons around personal tasks
    for (const lesson of params.pendingLessons.slice(0, 5)) {
        let slotStart = currentTime;
        const lessonDuration = params.preferences.preferredSessionLength;
        let slotEnd = addMinutes(slotStart, lessonDuration);

        // Skip if we've exceeded available time
        if (compareTime(slotStart, params.preferences.preferredEndTime) >= 0) {
            break;
        }

        // Find a free slot
        while (!isSlotFree(slotStart, slotEnd) && compareTime(slotEnd, params.preferences.preferredEndTime) < 0) {
            slotStart = addMinutes(slotStart, 15);
            slotEnd = addMinutes(slotStart, lessonDuration);
        }

        // Skip if no slot found
        if (compareTime(slotEnd, params.preferences.preferredEndTime) > 0) {
            break;
        }

        // Add lesson
        items.push({
            id: crypto.randomUUID(),
            startTime: slotStart,
            endTime: slotEnd,
            title: lesson.lessonTitle,
            description: `From ${lesson.courseTitle}`,
            type: 'lesson',
            courseId: lesson.courseId,
            lessonId: lesson.lessonId,
            completed: false,
            priority: 'medium',
        });

        sessionCount++;
        currentTime = slotEnd;

        // Add break if there's room
        const breakLength = sessionCount % params.preferences.longBreakAfter === 0
            ? params.preferences.longBreakLength
            : params.preferences.breakLength;

        const breakEnd = addMinutes(currentTime, breakLength);

        if (compareTime(breakEnd, params.preferences.preferredEndTime) <= 0 && isSlotFree(currentTime, breakEnd)) {
            items.push({
                id: crypto.randomUUID(),
                startTime: currentTime,
                endTime: breakEnd,
                title: sessionCount % params.preferences.longBreakAfter === 0 ? 'Long Break' : 'Short Break',
                description: 'Take a rest',
                type: 'break',
                completed: false,
                priority: 'low',
            });
            currentTime = breakEnd;
        } else {
            currentTime = addMinutes(currentTime, 5);
        }
    }

    // Final sort by start time
    items.sort((a, b) => compareTime(a.startTime, b.startTime));

    return items;
}

// ============ NATURAL LANGUAGE PARSING ============

interface NLEditResult {
    success: boolean;
    message?: string;
    action?: string;
    changes?: string;
    updatedItems?: ScheduleItem[];
}

export async function parseNaturalLanguageEdit(
    userInput: string,
    currentItems: ScheduleItem[],
    timeConstraints?: { startTime: string; endTime: string }
): Promise<NLEditResult> {
    if (!genai) {
        return { success: false, message: 'AI features are not available' };
    }

    const startBound = timeConstraints?.startTime || '06:00';
    const endBound = timeConstraints?.endTime || '22:00';

    const prompt = `You are a schedule editing assistant. Parse the user's natural language command and modify the schedule accordingly.

CURRENT SCHEDULE:
${JSON.stringify(currentItems, null, 2)}

USER COMMAND: "${userInput}"

**CRITICAL TIME CONSTRAINTS**:
- Earliest allowed start time: ${startBound}
- Latest allowed end time: ${endBound}
- DO NOT schedule ANY items before ${startBound} or after ${endBound}
- If the user requests something that would exceed these bounds, politely decline and explain why

Common commands include:
- "Move X to Y time" - Change the start time of an item
- "Remove/Delete X" - Remove an item from schedule
- "Add a break at X" - Add a break at specified time
- "Swap X and Y" - Swap positions of two items
- "Make X longer/shorter by Y minutes" - Adjust duration
- "Skip X" - Remove a specific item
- "Reschedule X to after Y" - Move item to after another

Analyze the command and return a JSON object with:
{
  "success": true/false,
  "message": "Human-readable confirmation or error message",
  "action": "Brief description of action taken",
  "changes": "Summary of what changed",
  "updatedItems": [...] // The modified schedule array, or null if failed
}

IMPORTANT: 
- When moving items, adjust all subsequent items' times appropriately
- Maintain the same total duration for moved items
- Keep breaks appropriately spaced
- NEVER schedule items outside ${startBound} - ${endBound} range
- Return ONLY valid JSON, no markdown or extra text`;

    try {
        const response = await genai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
        });

        const text = response.text || '';

        // Extract JSON from response
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
            jsonStr = objMatch[0];
        }

        const result = JSON.parse(jsonStr) as NLEditResult;

        // Post-processing: Validate and clip items that exceed time bounds
        if (result.success && result.updatedItems) {
            result.updatedItems = result.updatedItems.map(item => {
                // Clip start time
                if (compareTime(item.startTime, startBound) < 0) {
                    item.startTime = startBound;
                }
                // Clip end time
                if (compareTime(item.endTime, endBound) > 0) {
                    item.endTime = endBound;
                }
                // Handle case where start > end after clipping
                if (compareTime(item.startTime, item.endTime) >= 0) {
                    // Skip this item by setting a minimal duration
                    const [h, m] = item.startTime.split(':').map(Number);
                    const endMins = h * 60 + m + 15; // minimum 15 min
                    const endH = Math.floor(endMins / 60);
                    const endM = endMins % 60;
                    item.endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                }
                return item;
            }).filter(item => compareTime(item.startTime, endBound) < 0); // Remove items completely out of bounds
        }

        return result;
    } catch (error) {
        console.error('Failed to parse natural language edit:', error);
        return {
            success: false,
            message: 'Could not understand the command. Try being more specific.'
        };
    }
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
    const mins1 = h1 * 60 + m1;
    const mins2 = h2 * 60 + m2;
    return mins1 - mins2;
}

// Legacy function for backward compatibility
export interface LegacyScheduleParams {
    studentGoals: string[];
    availableHours: number;
    enrolledCourses: {
        courseId: string;
        title: string;
        pendingLessons: {
            lessonId: string;
            title: string;
            estimatedMinutes: number;
        }[];
    }[];
    previousProgress?: string;
}

export async function generateDailySchedule(params: LegacyScheduleParams): Promise<string> {
    if (!genai) return '[]';

    const prompt = `Generate a daily learning schedule for a student with the following parameters:

Goals: ${params.studentGoals.join(', ')}
Available hours today: ${params.availableHours}

Enrolled courses and pending lessons:
${params.enrolledCourses
            .map(
                (c) =>
                    `- ${c.title}:\n${c.pendingLessons.map((l) => `  • ${l.title} (${l.estimatedMinutes} min)`).join('\n')}`
            )
            .join('\n\n')}

${params.previousProgress ? `Previous progress notes: ${params.previousProgress}` : ''}

Create an optimized daily schedule that:
1. Respects the available time
2. Prioritizes based on goals
3. Includes short breaks between focused sessions
4. Balances difficulty across the day

Return the schedule as a JSON array with objects containing:
- startTime (HH:MM format)
- endTime (HH:MM format)
- courseId
- lessonId
- title
- type: "lesson" | "break"

Only return valid JSON, no additional text.`;

    const response = await genai.models.generateContent({
        model: MODELS.FLASH,
        contents: prompt,
    });

    return response.text || '[]';
}

// ============ SMART TASK PARSING ============

import type { TimeOfDay, TaskRecurrence } from '../types';

interface ParsedSmartTask {
    title: string;
    description?: string;
    duration: number; // minutes
    preferredTime: TimeOfDay;
    specificTime?: string; // HH:MM
    recurrence: TaskRecurrence;
    daysOfWeek?: number[];
    endDate?: string; // YYYY-MM-DD
}

export async function parseSmartTaskInput(input: string): Promise<ParsedSmartTask> {
    if (!genai) {
        // Fallback parsing without AI
        return fallbackParseTask(input);
    }

    const prompt = `Parse the following natural language task input and extract structured data.

INPUT: "${input}"

Extract:
1. title: A concise task title (without time/recurrence info)
2. description: Optional longer description
3. duration: Duration in MINUTES (default 60 if not specified)
4. preferredTime: One of "morning", "afternoon", "evening", "night", "anytime"
5. specificTime: If exact time mentioned, format as HH:MM (24-hour)
6. recurrence: One of "once", "daily", "weekdays", "weekends", "weekly", "custom"
7. daysOfWeek: If specific days mentioned, array of numbers (0=Sunday, 1=Monday, etc.)
8. endDate: If end date mentioned, format as YYYY-MM-DD

Examples:
- "go to gym everyday for 1hr in evening" → title: "Go to gym", duration: 60, preferredTime: "evening", recurrence: "daily"
- "study math on weekdays at 4pm for 2 hours" → title: "Study math", duration: 120, specificTime: "16:00", recurrence: "weekdays"
- "attend yoga class on mon wed fri at 7am" → title: "Attend yoga class", duration: 60, specificTime: "07:00", recurrence: "custom", daysOfWeek: [1,3,5]

Return ONLY valid JSON, no markdown or extra text:
{
  "title": "string",
  "description": "string or null",
  "duration": number,
  "preferredTime": "morning|afternoon|evening|night|anytime",
  "specificTime": "HH:MM or null",
  "recurrence": "once|daily|weekdays|weekends|weekly|custom",
  "daysOfWeek": [numbers] or null,
  "endDate": "YYYY-MM-DD or null"
}`;

    try {
        const response = await genai.models.generateContent({
            model: MODELS.FLASH,
            contents: prompt,
        });

        const text = response.text || '';

        // Extract JSON from response
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
            jsonStr = objMatch[0];
        }

        const parsed = JSON.parse(jsonStr);

        return {
            title: parsed.title || input,
            description: parsed.description || undefined,
            duration: parsed.duration || 60,
            preferredTime: parsed.preferredTime || 'anytime',
            specificTime: parsed.specificTime || undefined,
            recurrence: parsed.recurrence || 'once',
            daysOfWeek: parsed.daysOfWeek || undefined,
            endDate: parsed.endDate || undefined,
        };
    } catch (error) {
        console.error('Failed to parse task with AI:', error);
        return fallbackParseTask(input);
    }
}

function fallbackParseTask(input: string): ParsedSmartTask {
    const lowercased = input.toLowerCase();

    // Extract duration
    let duration = 60; // default
    const durationMatch = lowercased.match(/(\d+)\s*(hr|hour|hours|min|mins|minutes)/);
    if (durationMatch) {
        const num = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        duration = unit.startsWith('hr') || unit.startsWith('hour') ? num * 60 : num;
    }

    // Extract time of day
    let preferredTime: TimeOfDay = 'anytime';
    if (lowercased.includes('morning')) preferredTime = 'morning';
    else if (lowercased.includes('afternoon')) preferredTime = 'afternoon';
    else if (lowercased.includes('evening')) preferredTime = 'evening';
    else if (lowercased.includes('night')) preferredTime = 'night';

    // Extract recurrence
    let recurrence: TaskRecurrence = 'once';
    if (lowercased.includes('everyday') || lowercased.includes('every day') || lowercased.includes('daily')) {
        recurrence = 'daily';
    } else if (lowercased.includes('weekday')) {
        recurrence = 'weekdays';
    } else if (lowercased.includes('weekend')) {
        recurrence = 'weekends';
    } else if (lowercased.includes('weekly') || lowercased.includes('every week')) {
        recurrence = 'weekly';
    }

    // Extract specific time
    let specificTime: string | undefined;
    const timeMatch = lowercased.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3];
        if (period === 'pm' && hours !== 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;
        specificTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Clean title
    let title = input
        .replace(/\b(everyday|every day|daily|weekdays?|weekends?|weekly|every week)\b/gi, '')
        .replace(/\b(morning|afternoon|evening|night)\b/gi, '')
        .replace(/\b(for\s+)?\d+\s*(hr|hour|hours|min|mins|minutes)\b/gi, '')
        .replace(/\b(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, '')
        .replace(/\b(in|at|on|for)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
        title: title || input,
        duration,
        preferredTime,
        specificTime,
        recurrence,
    };
}
