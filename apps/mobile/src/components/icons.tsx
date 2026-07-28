// RN port of the web icon set (apps/web/src/components/icons.tsx). Same names,
// same 24x24 paths; `currentColor` has no meaning in RN so the color is an
// explicit prop defaulting to the ink tone the web inherits most of the time.
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import type { ReactNode } from 'react'
import type { ColorValue } from 'react-native'
import { colors } from '@/theme/tokens'

export type IconProps = {
  size?: number
  // ColorValue, not string: React Navigation hands its tab icons a platform
  // color object, and these icons render straight into a tab bar.
  color?: ColorValue
}

function Stroke({
  size = 18,
  color = colors.ink['600'],
  width = 2,
  children,
}: IconProps & { width?: number; children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  )
}

export function GripIcon({ size = 16, color = colors.ink['400'] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="9" cy="6" r="1.6" />
      <Circle cx="15" cy="6" r="1.6" />
      <Circle cx="9" cy="12" r="1.6" />
      <Circle cx="15" cy="12" r="1.6" />
      <Circle cx="9" cy="18" r="1.6" />
      <Circle cx="15" cy="18" r="1.6" />
    </Svg>
  )
}

export function DeckGlyph({
  size = 24,
  color = colors.brand['600'],
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill={color}>
      <Rect x="13" y="4" width="15" height="20" rx="4.5" opacity={0.4} />
      <Rect x="10" y="6.5" width="15" height="20" rx="4.5" opacity={0.65} />
      <Rect x="7" y="9" width="15" height="20" rx="4.5" />
    </Svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </Stroke>
  )
}

export function CheckIcon({ size = 15, ...props }: IconProps) {
  return (
    <Stroke size={size} width={3} {...props}>
      <Path d="M20 6L9 17l-5-5" />
    </Stroke>
  )
}

export function CheckSquareIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M9 11l3 3L22 4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Stroke>
  )
}

export function ListsIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Stroke>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M3 3v18h18M18 12l-3 3-3-3-3 4" />
    </Stroke>
  )
}

export function SparkleIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M12 3l1.9 4.8L19 9l-4.1 1.2L12 15l-1.9-4.8L6 9l4.1-1.2z" />
    </Stroke>
  )
}

export function RecurringIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M17 2l4 4-4 4M21 6H8a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h13a4 4 0 0 0 4-4" />
    </Stroke>
  )
}

export function CodeIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </Stroke>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M20 21a8 8 0 0 0-16 0" />
      <Circle cx="12" cy="7" r="4" />
    </Stroke>
  )
}

export function LinkIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <Path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </Stroke>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </Stroke>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </Stroke>
  )
}

export function ShareIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </Stroke>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M12 5v14M5 12h14" />
    </Stroke>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M15 18l-6-6 6-6" />
    </Stroke>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M9 18l6-6-6-6" />
    </Stroke>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M6 9l6 6 6-6" />
    </Stroke>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M18 6L6 18M6 6l12 12" />
    </Stroke>
  )
}

export function NoteIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Stroke>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="4" y="11" width="16" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Stroke>
  )
}

export function UnlockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="4" y="11" width="16" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 7.9-1" />
    </Stroke>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M10 11v6M14 11v6" />
    </Stroke>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </Stroke>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M9 14L4 9l5-5" />
      <Path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </Stroke>
  )
}

export function FlameIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10-3 1-5 4-5 7-1 0-2-1-2-3-2 2-3 4-3 6a7 7 0 0 0 7 7z" />
    </Stroke>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Stroke>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Stroke>
  )
}

export function SendIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </Stroke>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Circle cx="8.5" cy="8.5" r="1.5" />
      <Path d="M21 15l-5-5L5 21" />
    </Stroke>
  )
}

export function MicIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="9" y="2" width="6" height="11" rx="3" />
      <Path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
    </Stroke>
  )
}

export function StopIcon({ size = 18, color = colors.ink['600'] }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x="6" y="6" width="12" height="12" rx="2" />
    </Svg>
  )
}

export function LogOutIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5M21 12H9" />
    </Stroke>
  )
}

export function CreditCardIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Rect x="2" y="5" width="20" height="14" rx="2" />
      <Path d="M2 10h20" />
    </Stroke>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Stroke>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </Stroke>
  )
}

export function TargetIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9 12l2 2 4-4" />
    </Stroke>
  )
}
