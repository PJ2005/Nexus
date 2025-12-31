import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (
        email: string,
        password: string,
        displayName: string,
        role: UserRole
    ) => Promise<void>;
    signInWithGoogle: (role?: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user document from Firestore
    async function fetchUserDoc(uid: string): Promise<User | null> {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return { uid, ...userDoc.data() } as User;
            }
            return null;
        } catch (err) {
            console.error('Error fetching user document:', err);
            return null;
        }
    }

    // Create user document in Firestore
    async function createUserDoc(
        uid: string,
        email: string,
        displayName: string,
        role: UserRole,
        photoURL?: string
    ): Promise<User> {
        const userData = {
            email,
            displayName,
            role,
            photoURL: photoURL || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        await setDoc(doc(db, 'users', uid), userData);

        return {
            uid,
            ...userData,
            createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
            updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
        } as User;
    }

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                const userDoc = await fetchUserDoc(fbUser.uid);
                setUser(userDoc);
            } else {
                setUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sign in with email/password
    async function signIn(email: string, password: string) {
        try {
            setError(null);
            setLoading(true);
            const { user: fbUser } = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );
            const userDoc = await fetchUserDoc(fbUser.uid);

            if (!userDoc) {
                throw new Error('User account not found. Please register first.');
            }

            setUser(userDoc);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to sign in';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    // Sign up with email/password
    async function signUp(
        email: string,
        password: string,
        displayName: string,
        role: UserRole
    ) {
        try {
            setError(null);
            setLoading(true);

            const { user: fbUser } = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Update Firebase profile
            await updateProfile(fbUser, { displayName });

            // Create Firestore document
            const userDoc = await createUserDoc(
                fbUser.uid,
                email,
                displayName,
                role
            );

            setUser(userDoc);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to create account';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    // Sign in with Google
    async function signInWithGoogle(role: UserRole = 'student') {
        try {
            setError(null);
            setLoading(true);

            const { user: fbUser } = await signInWithPopup(auth, googleProvider);

            // Check if user document exists
            let userDoc = await fetchUserDoc(fbUser.uid);

            if (!userDoc) {
                // Create new user document
                userDoc = await createUserDoc(
                    fbUser.uid,
                    fbUser.email || '',
                    fbUser.displayName || 'User',
                    role,
                    fbUser.photoURL || undefined
                );
            }

            setUser(userDoc);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to sign in with Google';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }

    // Sign out
    async function logout() {
        try {
            setError(null);
            await signOut(auth);
            setUser(null);
            setFirebaseUser(null);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Failed to sign out';
            setError(message);
            throw err;
        }
    }

    function clearError() {
        setError(null);
    }

    const value: AuthContextType = {
        user,
        firebaseUser,
        loading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
