import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: string
  error?: string
  showLabel?: string
  hideLabel?: string
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    {
      label,
      error,
      className,
      id,
      showLabel = 'Show password',
      hideLabel = 'Hide password',
      ...props
    },
    ref,
  ) {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const errorId = `${fieldId}-error`
    const invalid = Boolean(error)
    const [visible, setVisible] = useState(false)

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
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? 'text' : 'password'}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            className={cn(
              'text-ink-800 focus-visible:ring-3 h-11 w-full rounded-xl border-[1.5px] bg-white pl-3.5 pr-11 text-base outline-none transition sm:text-sm',
              invalid
                ? 'border-danger bg-danger/5 focus-visible:ring-danger/20'
                : 'border-line focus-visible:border-brand-600 focus-visible:ring-brand-600/15',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(current => !current)}
            aria-label={visible ? hideLabel : showLabel}
            aria-pressed={visible}
            className="text-ink-400 hover:text-ink-700 focus-visible:ring-3 focus-visible:ring-brand-600/15 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl outline-none transition"
          >
            {visible ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {invalid && (
          <p id={errorId} className="text-danger text-xs">
            {error}
          </p>
        )}
      </div>
    )
  },
)
