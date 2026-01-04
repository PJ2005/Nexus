# Nexus

An AI-powered learning management system that generates personalized study schedules based on student availability, preferences, and enrolled course content.

---

## Problem Statement

Students often struggle to manage their study time effectively. Traditional LMS platforms provide course content but leave scheduling entirely up to the learner. Nexus bridges this gap by using AI to create optimized daily study plans that adapt to real-life constraints.

---

## Features

### AI-Powered Schedule Generation
- Generates daily schedules using Google Gemini based on:
  - Available time slots and blocked periods (constraints)
  - Pending lessons and assignment due dates
  - Energy levels and preferred study times
  - Personal recurring tasks (gym, work, etc.)
- Supports Pomodoro-style session management with configurable breaks
- Natural language editing: users can modify schedules by typing commands like "move my math lesson to 4pm" or "skip the break"

### Course Management
- Teachers can create courses with modules, lessons, quizzes, and assignments
- Students browse available courses, enroll, and track progress
- Lesson completion tracking with automatic progress updates

### Role-Based Access
- **Students**: Dashboard, course enrollment, AI scheduler, goal tracking
- **Teachers**: Course creation, student management, content authoring
- **Admin**: Platform-level controls (in development)

### Smart Task System
- Add recurring tasks with natural language: "go to gym everyday at 7pm for 1 hour"
- Supports recurrence patterns: daily, weekdays, weekends, weekly, custom days
- Tasks are automatically injected into AI-generated schedules

---

## Mobile App

Nexus is also available as an Android mobile app. All data syncs seamlessly between web and mobile — courses, schedules, progress, and tasks stay in sync across devices. To use the mobile app, download the APK file `nexus-app.apk` from the repository, install it on your Android device, and log in with your existing account.

---

## Technical Architecture

### Data Models

The system is built around these core entities (defined in `src/types/index.ts`):

| Entity | Description |
|--------|-------------|
| `User` | Contains uid, role (student/teacher/admin), goals, availability |
| `Course` | Title, description, teacher info, enrollment count, status |
| `Module` | Ordered containers within courses |
| `Lesson` | Content units with estimated duration and attachments |
| `Quiz` / `Assignment` | Assessments tied to courses with due dates |
| `Schedule` | Daily schedule with items, completion tracking, edit history |
| `ScheduleItem` | Individual blocks (lesson, break, assignment, personal task) |
| `Constraint` | Blocked time periods (recurring or one-time) |
| `SmartTask` | Recurring personal tasks with auto-scheduling |

### Schedule Generation Pipeline

1. **Context Collection** (`scheduleService.getStudentContext`):
   - Fetches enrolled courses, pending lessons, upcoming assignments
   - Retrieves student preferences (session length, break duration, focus hours)
   - Loads constraints and personal tasks for the day
   - Calculates academic load based on assignment density

2. **AI Generation** (`gemini.generateScheduleWithAI`):
   - Constructs a detailed prompt with all context
   - Sends to Gemini with structured output requirements
   - Parses JSON response and validates item references
   - Post-processes to inject any missed personal tasks

3. **Persistence** (`scheduleService.saveSchedule`):
   - Stores schedule in Firestore with metadata
   - Tracks edit history for natural language modifications

### Natural Language Processing

Two main NLP features powered by Gemini:

**Schedule Editing** (`parseNaturalLanguageEdit`):
- Input: "Move Python lesson to after lunch"
- Output: Modified schedule array with adjusted times
- Respects time boundaries and maintains break spacing

**Task Parsing** (`parseSmartTaskInput`):
- Input: "study math on weekdays at 4pm for 2 hours"  
- Output: Structured task object with title, duration, recurrence, specific time

Both functions include fallback regex-based parsers for when AI is unavailable.

### AI Model Configuration

```typescript
MODELS = {
  FLASH: 'models/gemini-flash-lite-latest',  // Fast, used for schedule generation
  PRO: 'models/gemini-flash-latest',          // Complex reasoning tasks
}
```

---

## Project Structure

```
nexus/
├── src/
│   ├── components/       # Reusable UI (auth, layout, forms)
│   ├── contexts/         # React context (Auth, Theme, Layout)
│   ├── lib/
│   │   ├── firebase.ts   # Firebase client initialization
│   │   ├── supabase.ts   # Supabase client
│   │   └── gemini.ts     # AI functions (schedule gen, NLP parsing)
│   ├── pages/
│   │   ├── auth/         # Login, Register
│   │   ├── courses/      # Course CRUD, quiz/assignment forms
│   │   ├── dashboard/    # Role-specific dashboards
│   │   ├── learn/        # Student course viewer, lesson player
│   │   ├── schedule/     # AI scheduler interface
│   │   └── goals/        # Goal tracking
│   ├── services/
│   │   ├── courseService.ts    # Course/module/lesson CRUD
│   │   ├── scheduleService.ts  # Schedule generation and persistence
│   │   ├── taskService.ts      # Smart task management
│   │   └── storageService.ts   # File uploads
│   └── types/            # TypeScript interfaces
├── android/              # Capacitor Android project
└── dist/                 # Production build
```

---

## API Reference

### Schedule Service

| Function | Description |
|----------|-------------|
| `generateSchedule(studentId, date, hours?, energy?)` | Generates AI schedule for a date |
| `getStudentContext(studentId)` | Collects all data needed for generation |
| `editScheduleWithNL(scheduleId, userInput, items)` | Modifies schedule via natural language |
| `saveSchedule(schedule)` | Persists schedule to Firestore |
| `getSchedule(studentId, date)` | Retrieves schedule for a specific date |

### Course Service

| Function | Description |
|----------|-------------|
| `createCourse(teacherId, name, data)` | Creates new course |
| `getPublishedCourses()` | Lists all published courses for browsing |
| `createLesson(courseId, moduleId, data)` | Adds lesson to module |
| `getCourseAssignments(courseId)` | Fetches all assignments for a course |

### Gemini Functions

| Function | Description |
|----------|-------------|
| `generateScheduleWithAI(params)` | Core schedule generation |
| `parseNaturalLanguageEdit(input, items, constraints)` | NL schedule modification |
| `parseSmartTaskInput(input)` | Extract task data from natural language |
| `generateWithContext(prompt, context)` | RAG-style generation with course content |

---

## Setup

```bash
cd nexus
npm install

# Configure environment
cp ../.env.example .env
# Add API keys and credentials

npm run dev
```

### Android Build

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key |
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router
- **Styling**: Tailwind CSS
- **AI**: Google Gemini (`@google/genai` SDK)
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Supabase Storage
- **Mobile**: Capacitor (Android)

---

## License

MIT
