import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { AuthLayout } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

export function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, displayName, role);
            navigate('/dashboard');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to create account'
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignUp() {
        setError('');
        setLoading(true);

        try {
            await signInWithGoogle(role);
            navigate('/dashboard');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to sign up with Google'
            );
        } finally {
            setLoading(false);
        }
    }

    const roleOptions: { value: UserRole; label: string; description: string }[] = [
        {
            value: 'student',
            label: 'Student',
            description: 'Learn from courses and get AI-powered schedules',
        },
        {
            value: 'teacher',
            label: 'Teacher',
            description: 'Create and manage courses and content',
        },
    ];

    return (
        <AuthLayout>
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <h1
                    style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 'var(--font-semibold)',
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-2)',
                    }}
                >
                    Create an account
                </h1>
                <p
                    style={{
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    Start your learning journey with Nexus
                </p>
            </div>

            {error && (
                <div
                    style={{
                        padding: 'var(--space-3) var(--space-4)',
                        backgroundColor: 'var(--danger-light)',
                        color: 'var(--danger)',
                        fontSize: 'var(--text-sm)',
                        marginBottom: 'var(--space-4)',
                        border: '1px solid var(--danger)',
                    }}
                >
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {/* Role Selection */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 'var(--font-medium)',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-2)',
                            }}
                        >
                            I am a...
                        </label>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            {roleOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setRole(option.value)}
                                    style={{
                                        flex: 1,
                                        padding: 'var(--space-3)',
                                        border: `1px solid ${role === option.value ? 'var(--accent)' : 'var(--border-default)'}`,
                                        backgroundColor: role === option.value ? 'var(--accent-light)' : 'var(--bg-primary)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all var(--transition-fast)',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 'var(--text-sm)',
                                            fontWeight: 'var(--font-medium)',
                                            color: role === option.value ? 'var(--accent-text)' : 'var(--text-primary)',
                                        }}
                                    >
                                        {option.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--text-muted)',
                                            marginTop: 'var(--space-1)',
                                        }}
                                    >
                                        {option.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Input
                        label="Full name"
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        icon={<User size={18} />}
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<Mail size={18} />}
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<Lock size={18} />}
                        hint="Must be at least 6 characters"
                        required
                    />

                    <Input
                        label="Confirm password"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        icon={<Lock size={18} />}
                        required
                    />

                    <Button type="submit" fullWidth loading={loading}>
                        Create account
                    </Button>
                </div>
            </form>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    margin: 'var(--space-6) 0',
                }}
            >
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
            </div>

            <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleGoogleSignUp}
                disabled={loading}
                icon={
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                }
            >
                Continue with Google
            </Button>

            <p
                style={{
                    marginTop: 'var(--space-6)',
                    textAlign: 'center',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                }}
            >
                Already have an account?{' '}
                <Link
                    to="/login"
                    style={{
                        color: 'var(--accent-text)',
                        fontWeight: 'var(--font-medium)',
                    }}
                >
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
}
