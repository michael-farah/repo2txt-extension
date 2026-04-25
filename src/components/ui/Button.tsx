import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-primary-600 text-white shadow-sm',
    'hover:bg-primary-700 hover:shadow-md hover:-translate-y-px',
    'active:bg-primary-800 active:translate-y-0 active:shadow-sm',
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'dark:bg-primary-500 dark:hover:bg-primary-600 dark:active:bg-primary-700',
  ),
  secondary: cn(
    'bg-gray-200 text-gray-900 border border-gray-300 shadow-sm',
    'hover:bg-gray-300 hover:shadow-md hover:-translate-y-px',
    'active:translate-y-0 active:shadow-sm',
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600',
  ),
  ghost: cn(
    'text-gray-500',
    'hover:bg-gray-200 hover:text-gray-900',
    'active:bg-gray-300',
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:active:bg-gray-700',
  ),
  danger: cn(
    'bg-red-600 text-white shadow-sm',
    'hover:bg-red-700 hover:shadow-md hover:-translate-y-px',
    'active:bg-red-700 active:translate-y-0',
    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
    'dark:bg-red-700 dark:hover:bg-red-800',
  ),
  success: cn(
    'bg-green-600 text-white shadow-sm',
    'hover:bg-green-700 hover:shadow-md hover:-translate-y-px',
    'active:bg-green-700 active:translate-y-0',
    'focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2',
    'dark:bg-green-700 dark:hover:bg-green-800',
  ),
  outline: cn(
    'border border-primary-500 text-primary-600',
    'hover:bg-primary-50 hover:-translate-y-px',
    'active:bg-primary-100 active:translate-y-0',
    'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-950',
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-2.5 text-base gap-2 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-out',
          'touch-manipulation select-none',
          'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-current w-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
