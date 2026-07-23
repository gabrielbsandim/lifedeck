// Minimal class-name joiner for NativeWind. Unlike the web cn() it drops
// tailwind-merge (which is tuned for the DOM class set); on native, NativeWind
// resolves conflicting utilities by order, so appending overrides last is
// enough. Accepts strings and conditional (cond && 'class') values.
type ClassValue = string | false | null | undefined

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ')
}
