import { motion } from 'framer-motion'
import { cn } from '../utils/cn'

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
        'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors',
        checked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-white"
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
