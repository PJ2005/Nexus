import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth';
import { PageLayout } from './components/layout';
import { LoginPage, RegisterPage } from './pages/auth';
import { DashboardPage } from './pages/dashboard';
import {
  TeacherCoursesPage,
  CourseFormPage,
  CourseDetailPage,
  QuizFormPage,
  AssignmentFormPage,
} from './pages/courses';
import { StudentsPage } from './pages/students';
import { SettingsPage } from './pages/settings';
import { BrowseCoursesPage, MyCoursesPage, LessonViewerPage } from './pages/learn';
import { SchedulePage } from './pages/schedule';
import { GoalsPage } from './pages/goals';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Course routes */}
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <TeacherCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/new"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <CourseFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId"
              element={
                <ProtectedRoute>
                  <CourseDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/edit"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <CourseFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/quizzes/new"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <QuizFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/quizzes/:quizId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <QuizFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/assignments/new"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <AssignmentFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:courseId/assignments/:assignmentId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <AssignmentFormPage />
                </ProtectedRoute>
              }
            />

            {/* Student routes */}
            <Route
              path="/browse"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <BrowseCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <MyCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learn/:courseId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <LessonViewerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learn/:courseId/:lessonId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <LessonViewerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <GoalsPage />
                </ProtectedRoute>
              }
            />

            {/* Teacher routes */}
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ComingSoon title="Admin Panel" />
                </ProtectedRoute>
              }
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Temporary placeholder component
function ComingSoon({ title }: { title: string }) {
  return (
    <PageLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}
        >
          {title}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>This page is coming soon.</p>
      </div>
    </PageLayout>
  );
}

// 404 page
function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        textAlign: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-semibold)',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        404
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
        Page not found
      </p>
      <a
        href="/dashboard"
        style={{
          color: 'var(--accent)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-medium)',
        }}
      >
        Go to Dashboard
      </a>
    </div>
  );
}

export default App;
