export function BookingBadge({ label }: { label: string }) {
  return (
    <span className="flex-none rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-500">
      {label}
    </span>
  )
}
