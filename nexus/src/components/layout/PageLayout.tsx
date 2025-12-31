import { type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useLayout } from '../../contexts/LayoutContext';

interface PageLayoutProps {
    children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
    const { sidebarCollapsed, isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useLayout();

    const mainStyles: React.CSSProperties = {
        marginLeft: isMobile ? 0 : sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        transition: 'margin-left var(--transition-base)',
        position: 'relative',
        width: '100%',
    };

    const contentStyles: React.CSSProperties = {
        padding: 'var(--space-8)',
        maxWidth: '1400px',
        margin: '0 auto',
    };

    // Mobile Header
    const mobileHeaderStyles: React.CSSProperties = {
        display: isMobile ? 'flex' : 'none',
        alignItems: 'center',
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
    };

    // Overlay for mobile sidebar
    const overlayStyles: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 40,
        opacity: isMobile && sidebarOpen ? 1 : 0,
        pointerEvents: isMobile && sidebarOpen ? 'auto' : 'none',
        transition: 'opacity var(--transition-base)',
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />

            {/* Mobile Overlay */}
            <div
                style={overlayStyles}
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <main style={mainStyles}>
                {/* Mobile Header */}
                <div style={mobileHeaderStyles}>
                    <button
                        onClick={toggleSidebar}
                        style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            padding: 'var(--space-2)',
                        }}
                    >
                        <Menu size={24} />
                    </button>
                    <span
                        style={{
                            marginLeft: 'var(--space-3)',
                            fontSize: 'var(--text-lg)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        Nexus
                    </span>
                </div>

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
