import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    BookOpen,
    Calendar,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Target,
    Moon,
    Sun,
    Compass,
    Library,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserRole } from '../../types';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    roles: UserRole[];
}

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard size={20} />,
        roles: ['admin', 'teacher', 'student'],
    },
    // Student-specific items
    {
        label: 'Browse Courses',
        path: '/browse',
        icon: <Compass size={20} />,
        roles: ['student'],
    },
    {
        label: 'My Courses',
        path: '/my-courses',
        icon: <Library size={20} />,
        roles: ['student'],
    },
    {
        label: 'My Schedule',
        path: '/schedule',
        icon: <Calendar size={20} />,
        roles: ['student'],
    },
    {
        label: 'My Goals',
        path: '/goals',
        icon: <Target size={20} />,
        roles: ['student'],
    },
    // Teacher-specific items
    {
        label: 'Courses',
        path: '/courses',
        icon: <BookOpen size={20} />,
        roles: ['admin', 'teacher'],
    },
    {
        label: 'Students',
        path: '/students',
        icon: <GraduationCap size={20} />,
        roles: ['teacher'],
    },
    // Admin items
    {
        label: 'Users',
        path: '/admin/users',
        icon: <Users size={20} />,
        roles: ['admin'],
    },
    // Common
    {
        label: 'Settings',
        path: '/settings',
        icon: <Settings size={20} />,
        roles: ['admin', 'teacher', 'student'],
    },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    const filteredNavItems = navItems.filter(
        (item) => user && item.roles.includes(user.role)
    );

    const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

    const sidebarStyles: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: sidebarWidth,
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-base)',
        zIndex: 100,
    };

    const logoStyles: React.CSSProperties = {
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        height: '64px',
    };

    const navStyles: React.CSSProperties = {
        flex: 1,
        padding: 'var(--space-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        overflowY: 'auto',
    };

    const navLinkStyles = (isActive: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: collapsed ? 'var(--space-3)' : 'var(--space-3) var(--space-4)',
        justifyContent: collapsed ? 'center' : 'flex-start',
        color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
        backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
        textDecoration: 'none',
        fontSize: 'var(--text-sm)',
        fontWeight: isActive ? 'var(--font-medium)' : 'var(--font-normal)',
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
    });

    const footerStyles: React.CSSProperties = {
        padding: 'var(--space-3)',
        borderTop: '1px solid var(--border-default)',
    };

    const userInfoStyles: React.CSSProperties = {
        display: collapsed ? 'none' : 'flex',
        flexDirection: 'column',
        marginBottom: 'var(--space-3)',
        padding: 'var(--space-3)',
        backgroundColor: 'var(--bg-tertiary)',
    };

    const actionButtonStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3)',
        width: '100%',
        color: 'var(--text-secondary)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        transition: 'all var(--transition-fast)',
    };

    return (
        <aside style={sidebarStyles}>
            {/* Logo */}
            <div style={logoStyles}>
                {!collapsed && (
                    <span
                        style={{
                            fontSize: 'var(--text-lg)',
                            fontWeight: 'var(--font-semibold)',
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Nexus
                    </span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-2)',
                        color: 'var(--text-muted)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Navigation */}
            <nav style={navStyles}>
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => navLinkStyles(isActive)}
                        onMouseEnter={(e) => {
                            if (!location.pathname.startsWith(item.path)) {
                                e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!location.pathname.startsWith(item.path)) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                        title={collapsed ? item.label : undefined}
                    >
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            {item.icon}
                        </span>
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div style={footerStyles}>
                {/* User Info */}
                <div style={userInfoStyles}>
                    <span
                        style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--font-medium)',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {user?.displayName}
                    </span>
                    <span
                        style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            textTransform: 'capitalize',
                        }}
                    >
                        {user?.role}
                    </span>
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={actionButtonStyles}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    {!collapsed && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
                </button>

                {/* Logout */}
                <button
                    onClick={logout}
                    style={{ ...actionButtonStyles, color: 'var(--danger)' }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--danger-light)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <LogOut size={18} />
                    {!collapsed && <span>Sign out</span>}
                </button>
            </div>
        </aside>
    );
}
