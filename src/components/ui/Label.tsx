import React from 'react'
import { twMerge } from 'tailwind-merge'

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={twMerge(
          'text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer',
          className
        )}
        {...props}
      />
    )
  }
)
Label.displayName = 'Label'
