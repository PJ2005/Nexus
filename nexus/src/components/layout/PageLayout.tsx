import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface PageLayoutProps {
    children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
    const mainStyles: React.CSSProperties = {
        marginLeft: 'var(--sidebar-width)',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        transition: 'margin-left var(--transition-base)',
    };

    const contentStyles: React.CSSProperties = {
        padding: 'var(--space-8)',
        maxWidth: '1400px',
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={mainStyles}>
                <div style={contentStyles}>{children}</div>
            </main>
        </div>
    );
}

// Auth layout - no sidebar, centered content
interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    const containerStyles: React.CSSProperties = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        backgroundColor: 'var(--bg-secondary)',
    };

    const cardStyles: React.CSSProperties = {
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        padding: 'var(--space-8)',
    };

    return (
        <div style={containerStyles}>
            <div style={cardStyles}>{children}</div>
        </div>
    );
}
