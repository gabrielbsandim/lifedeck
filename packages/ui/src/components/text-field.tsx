import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, className, id, ...props }, ref) {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const errorId = `${fieldId}-error`
    const invalid = Boolean(error)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'text-sm font-medium',
              invalid ? 'text-danger' : 'text-ink-700',
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className={cn(
            'text-ink-800 focus-visible:ring-3 h-11 rounded-xl border-[1.5px] bg-white px-3.5 text-sm outline-none transition',
            invalid
              ? 'border-danger bg-danger/5 focus-visible:ring-danger/20'
              : 'border-line focus-visible:border-brand-600 focus-visible:ring-brand-600/15',
            className,
          )}
          {...props}
        />
        {invalid && (
          <p id={errorId} className="text-danger text-xs">
            {error}
          </p>
        )}
      </div>
    )
  },
)
