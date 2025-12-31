import {
    type InputHTMLAttributes,
    type ReactNode,
    forwardRef,
    useState,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    icon?: ReactNode;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            hint,
            icon,
            fullWidth = true,
            type = 'text',
            style,
            ...props
        },
        ref
    ) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';
        const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

        const containerStyles: React.CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
            width: fullWidth ? '100%' : 'auto',
        };

        const labelStyles: React.CSSProperties = {
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)' as unknown as number,
            color: 'var(--text-primary)',
        };

        const inputWrapperStyles: React.CSSProperties = {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
        };

        const inputStyles: React.CSSProperties = {
            width: '100%',
            height: '40px',
            padding: icon ? '0 var(--space-4) 0 var(--space-10)' : '0 var(--space-4)',
            paddingRight: isPassword ? 'var(--space-10)' : 'var(--space-4)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-primary)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border-default)'}`,
            borderRadius: 0,
            transition: 'border-color var(--transition-fast)',
            ...style,
        };

        const iconStyles: React.CSSProperties = {
            position: 'absolute',
            left: 'var(--space-3)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
        };

        const passwordToggleStyles: React.CSSProperties = {
            position: 'absolute',
            right: 'var(--space-3)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
        };

        const hintStyles: React.CSSProperties = {
            fontSize: 'var(--text-xs)',
            color: error ? 'var(--danger)' : 'var(--text-muted)',
        };

        return (
            <div style={containerStyles}>
                {label && <label style={labelStyles}>{label}</label>}
                <div style={inputWrapperStyles}>
                    {icon && <span style={iconStyles}>{icon}</span>}
                    <input
                        ref={ref}
                        type={inputType}
                        style={inputStyles}
                        onFocus={(e) => {
                            e.target.style.borderColor = error
                                ? 'var(--danger)'
                                : 'var(--accent)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = error
                                ? 'var(--danger)'
                                : 'var(--border-default)';
                        }}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            style={passwordToggleStyles}
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                </div>
                {(error || hint) && <span style={hintStyles}>{error || hint}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
