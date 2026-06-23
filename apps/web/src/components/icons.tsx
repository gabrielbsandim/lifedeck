import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Stroke({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

/** Six-dot drag handle, matching the design prototype. */
export function GripIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      {...props}
    >
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Stroke>
  )
}

export function ListsIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Stroke>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M3 3v18h18M18 12l-3 3-3-3-3 4" />
    </Stroke>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 3l1.9 4.8L19 9l-4.1 1.2L12 15l-1.9-4.8L6 9l4.1-1.2z" />
    </Stroke>
  )
}

export function RecurringIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M17 2l4 4-4 4M21 6H8a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h13a4 4 0 0 0 4-4" />
    </Stroke>
  )
}

export function CodeIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </Stroke>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </Stroke>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </Stroke>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 5v14M5 12h14" />
    </Stroke>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Stroke>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M9 18l6-6-6-6" />
    </Stroke>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Stroke>
  )
}

export function NoteIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Stroke>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Stroke>
  )
}

export function UnlockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.9-1" />
    </Stroke>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </Stroke>
  )
}
