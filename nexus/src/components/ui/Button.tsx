import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    children: ReactNode;
}

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
    sm: { padding: '0 var(--space-3)', fontSize: 'var(--text-sm)', height: '32px' },
    md: { padding: '0 var(--space-4)', fontSize: 'var(--text-sm)', height: '40px' },
    lg: { padding: '0 var(--space-6)', fontSize: 'var(--text-base)', height: '48px' },
};

export function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    children,
    disabled,
    style,
    ...props
}: ButtonProps) {
    const sizeStyle = sizeStyles[size];

    const baseStyles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        borderRadius: 0,
        fontWeight: 'var(--font-medium)' as unknown as number,
        transition: 'all var(--transition-fast)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        width: fullWidth ? '100%' : 'auto',
        height: sizeStyle.height,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        whiteSpace: 'nowrap',
        ...style,
    };

    // Parse CSS strings to objects (simplified approach using inline styles)
    const getVariantStyles = (): React.CSSProperties => {
        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: 'var(--accent)',
                    color: 'var(--text-inverse)',
                    border: '1px solid var(--accent)',
                };
            case 'secondary':
                return {
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid transparent',
                };
            case 'danger':
                return {
                    backgroundColor: 'var(--danger)',
                    color: 'var(--text-inverse)',
                    border: '1px solid var(--danger)',
                };
        }
    };

    return (
        <button
            style={{ ...baseStyles, ...getVariantStyles() }}
            disabled={disabled || loading}
            onMouseEnter={(e) => {
                if (disabled || loading) return;
                const target = e.currentTarget;
                switch (variant) {
                    case 'primary':
                        target.style.backgroundColor = 'var(--accent-hover)';
                        target.style.borderColor = 'var(--accent-hover)';
                        break;
                    case 'secondary':
                        target.style.backgroundColor = 'var(--bg-hover)';
                        target.style.borderColor = 'var(--border-strong)';
                        break;
                    case 'ghost':
                        target.style.backgroundColor = 'var(--bg-hover)';
                        break;
                    case 'danger':
                        target.style.backgroundColor = '#b92d2d';
                        break;
                }
            }}
            onMouseLeave={(e) => {
                const target = e.currentTarget;
                const styles = getVariantStyles();
                target.style.backgroundColor = (styles.backgroundColor as string) || '';
                const borderValue = styles.border as string | undefined;
                const borderParts = borderValue ? borderValue.split(' ') : [];
                target.style.borderColor = borderParts[2] || '';
            }}
            {...props}
        >
            {loading ? (
                <span
                    style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid currentColor',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                    }}
                />
            ) : icon ? (
                <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
            ) : null}
            {children}
        </button>
    );
}

// Add spin keyframes via style tag
if (typeof document !== 'undefined') {
    const styleId = 'button-animations';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
        document.head.appendChild(style);
    }
}
