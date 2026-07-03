import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={twMerge(
          clsx(
            'flex min-h-11 w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            className
          )
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
