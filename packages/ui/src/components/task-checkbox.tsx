import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type TaskCheckboxProps = {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function TaskCheckbox({
  checked,
  label,
  onChange,
  disabled = false,
}: TaskCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-6 w-6 flex-none items-center justify-center rounded-lg border-2 transition-colors duration-150',
        checked
          ? 'border-brand-600 bg-brand-600'
          : 'border-ink-500/40 bg-white',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 text-white"
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <path
          d="M5 13l4 4L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </button>
  )
}
