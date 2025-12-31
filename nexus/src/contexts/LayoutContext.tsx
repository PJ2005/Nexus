import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
    sidebarOpen: boolean;
    sidebarCollapsed: boolean;
    isMobile: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    toggleCollapse: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop rail
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.matchMedia('(max-width: 768px)').matches);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close mobile sidebar when switching to desktop
    useEffect(() => {
        if (!isMobile) {
            setSidebarOpen(false);
        }
    }, [isMobile]);

    const toggleSidebar = () => setSidebarOpen(prev => !prev);
    const closeSidebar = () => setSidebarOpen(false);
    const toggleCollapse = () => setSidebarCollapsed(prev => !prev);

    return (
        <LayoutContext.Provider
            value={{
                sidebarOpen,
                sidebarCollapsed,
                isMobile,
                toggleSidebar,
                closeSidebar,
                toggleCollapse,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
