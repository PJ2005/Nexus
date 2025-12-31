import { type ReactNode, type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
}

const paddingMap = {
    none: '0',
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
};

export function Card({
    children,
    padding = 'md',
    hover = false,
    onClick,
    style,
    ...props
}: CardProps) {
    const cardStyles: React.CSSProperties = {
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 0,
        padding: paddingMap[padding],
        transition: 'all var(--transition-fast)',
        cursor: onClick || hover ? 'pointer' : 'default',
        ...style,
    };

    return (
        <div
            style={cardStyles}
            onClick={onClick}
            onMouseEnter={(e) => {
                if (hover || onClick) {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }
            }}
            onMouseLeave={(e) => {
                if (hover || onClick) {
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                }
            }}
            {...props}
        >
            {children}
        </div>
    );
}

// Card Header
interface CardHeaderProps {
    children: ReactNode;
    action?: ReactNode;
}

export function CardHeader({ children, action }: CardHeaderProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
            }}
        >
            <div>{children}</div>
            {action && <div>{action}</div>}
        </div>
    );
}

// Card Title
interface CardTitleProps {
    children: ReactNode;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({ children, as: Tag = 'h3' }: CardTitleProps) {
    return (
        <Tag
            style={{
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--text-primary)',
                margin: 0,
            }}
        >
            {children}
        </Tag>
    );
}

// Card Description
interface CardDescriptionProps {
    children: ReactNode;
}

export function CardDescription({ children }: CardDescriptionProps) {
    return (
        <p
            style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-1)',
            }}
        >
            {children}
        </p>
    );
}

// Card Content
interface CardContentProps {
    children: ReactNode;
}

export function CardContent({ children }: CardContentProps) {
    return <div>{children}</div>;
}

// Card Footer
interface CardFooterProps {
    children: ReactNode;
    align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({ children, align = 'right' }: CardFooterProps) {
    const justifyMap = {
        left: 'flex-start',
        center: 'center',
        right: 'flex-end',
        between: 'space-between',
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: justifyMap[align],
                gap: 'var(--space-3)',
                marginTop: 'var(--space-4)',
                paddingTop: 'var(--space-4)',
                borderTop: '1px solid var(--border-subtle)',
            }}
        >
            {children}
        </div>
    );
}
