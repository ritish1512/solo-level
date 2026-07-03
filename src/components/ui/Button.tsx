import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            'inline-flex min-h-11 items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none rounded-md cursor-pointer active:scale-[0.98]',
            {
              // variants
              'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm': variant === 'primary',
              'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
              'border border-border bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100': variant === 'outline',
              'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100': variant === 'ghost',
              'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm': variant === 'destructive',

              // sizes
              'h-11 px-3 text-xs': size === 'sm',
              'h-11 px-4 py-2 text-sm': size === 'md',
              'h-11 px-8 text-base': size === 'lg',
            },
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
