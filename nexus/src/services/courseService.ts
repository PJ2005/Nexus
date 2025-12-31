import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
    Course,
    Module,
    Lesson,
    Quiz,
    Assignment,
    CourseMaterial,
    CourseStatus,
    MaterialAttachment,
} from '../types';

// ============================================
// COURSES
// ============================================

export async function createCourse(
    teacherId: string,
    teacherName: string,
    data: {
        title: string;
        description: string;
        coverImage?: string;
    }
): Promise<string> {
    const courseData = {
        ...data,
        teacherId,
        teacherName,
        status: 'draft' as CourseStatus,
        enrolledCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'courses'), courseData);
    return docRef.id;
}

export async function updateCourse(
    courseId: string,
    data: Partial<Omit<Course, 'id' | 'createdAt' | 'teacherId' | 'teacherName'>>
): Promise<void> {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteCourse(courseId: string): Promise<void> {
    await deleteDoc(doc(db, 'courses', courseId));
}

export async function getCourse(courseId: string): Promise<Course | null> {
    const docSnap = await getDoc(doc(db, 'courses', courseId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Course;
}

export async function getTeacherCourses(teacherId: string): Promise<Course[]> {
    const q = query(
        collection(db, 'courses'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Course));
}

export async function getPublishedCourses(): Promise<Course[]> {
    // Simple query without orderBy to avoid composite index requirement
    const q = query(
        collection(db, 'courses'),
        where('status', '==', 'published')
    );
    const snapshot = await getDocs(q);
    const courses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Course));
    // Sort client-side by createdAt descending
    return courses.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
    });
}

// ============================================
// MODULES
// ============================================

export async function createModule(
    courseId: string,
    data: {
        title: string;
        description: string;
        order: number;
        estimatedMinutes: number;
    }
): Promise<string> {
    const docRef = await addDoc(
        collection(db, 'courses', courseId, 'modules'),
        data
    );
    return docRef.id;
}

export async function updateModule(
    courseId: string,
    moduleId: string,
    data: Partial<Omit<Module, 'id'>>
): Promise<void> {
    const moduleRef = doc(db, 'courses', courseId, 'modules', moduleId);
    await updateDoc(moduleRef, data);
}

export async function deleteModule(
    courseId: string,
    moduleId: string
): Promise<void> {
    await deleteDoc(doc(db, 'courses', courseId, 'modules', moduleId));
}

export async function getModules(courseId: string): Promise<Module[]> {
    const q = query(
        collection(db, 'courses', courseId, 'modules'),
        orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Module));
}

// ============================================
// LESSONS
// ============================================

export async function createLesson(
    courseId: string,
    moduleId: string,
    data: {
        title: string;
        content: string;
        order: number;
        estimatedMinutes: number;
        documentIds?: string[];
        attachments?: MaterialAttachment[];
    }
): Promise<string> {
    const lessonData = {
        ...data,
        documentIds: data.documentIds || [],
        attachments: data.attachments || [],
    };
    const docRef = await addDoc(
        collection(db, 'courses', courseId, 'modules', moduleId, 'lessons'),
        lessonData
    );
    return docRef.id;
}

export async function updateLesson(
    courseId: string,
    moduleId: string,
    lessonId: string,
    data: Partial<Omit<Lesson, 'id'>>
): Promise<void> {
    const lessonRef = doc(
        db,
        'courses',
        courseId,
        'modules',
        moduleId,
        'lessons',
        lessonId
    );
    await updateDoc(lessonRef, data);
}

export async function deleteLesson(
    courseId: string,
    moduleId: string,
    lessonId: string
): Promise<void> {
    await deleteDoc(
        doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId)
    );
}

export async function getLessons(
    courseId: string,
    moduleId: string
): Promise<Lesson[]> {
    const q = query(
        collection(db, 'courses', courseId, 'modules', moduleId, 'lessons'),
        orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Lesson));
}

// ============================================
// QUIZZES
// ============================================

export async function createQuiz(
    courseId: string,
    data: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'courseId'>
): Promise<string> {
    const quizData = {
        ...data,
        courseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'quizzes'), quizData);
    return docRef.id;
}

export async function updateQuiz(
    quizId: string,
    data: Partial<Omit<Quiz, 'id' | 'createdAt' | 'courseId'>>
): Promise<void> {
    const quizRef = doc(db, 'quizzes', quizId);
    await updateDoc(quizRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteQuiz(quizId: string): Promise<void> {
    await deleteDoc(doc(db, 'quizzes', quizId));
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
    const docSnap = await getDoc(doc(db, 'quizzes', quizId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Quiz;
}

export async function getCourseQuizzes(courseId: string): Promise<Quiz[]> {
    const q = query(
        collection(db, 'quizzes'),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Quiz));
}

// ============================================
// ASSIGNMENTS
// ============================================

export async function createAssignment(
    courseId: string,
    data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'courseId'>
): Promise<string> {
    const assignmentData = {
        ...data,
        courseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'assignments'), assignmentData);
    return docRef.id;
}

export async function updateAssignment(
    assignmentId: string,
    data: Partial<Omit<Assignment, 'id' | 'createdAt' | 'courseId'>>
): Promise<void> {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
    await deleteDoc(doc(db, 'assignments', assignmentId));
}

export async function getAssignment(
    assignmentId: string
): Promise<Assignment | null> {
    const docSnap = await getDoc(doc(db, 'assignments', assignmentId));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Assignment;
}

export async function getCourseAssignments(
    courseId: string
): Promise<Assignment[]> {
    const q = query(
        collection(db, 'assignments'),
        where('courseId', '==', courseId),
        orderBy('dueDate', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Assignment)
    );
}

// ============================================
// MATERIALS
// ============================================

export async function createMaterial(
    data: Omit<CourseMaterial, 'id' | 'createdAt'>
): Promise<string> {
    const materialData = {
        ...data,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'materials'), materialData);
    return docRef.id;
}

export async function deleteMaterial(materialId: string): Promise<void> {
    await deleteDoc(doc(db, 'materials', materialId));
}

export async function getCourseMaterials(
    courseId: string
): Promise<CourseMaterial[]> {
    const q = query(
        collection(db, 'materials'),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as CourseMaterial)
    );
}
