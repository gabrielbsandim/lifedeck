import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type CelebrationProps = {
  active: boolean
  className?: string
}

const PARTICLE_COUNT = 16
const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc']

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2
  const distance = 64 + (index % 3) * 18
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: COLORS[index % COLORS.length] as string,
  }
})

export function Celebration({ active, className }: CelebrationProps) {
  const reduceMotion = useReducedMotion()
  const [burst, setBurst] = useState(0)
  const wasActive = useRef(false)

  useEffect(() => {
    if (active && !wasActive.current && !reduceMotion) {
      setBurst(value => value + 1)
    }
    wasActive.current = active
  }, [active, reduceMotion])

  if (burst === 0) {
    return null
  }

  return (
    <div
      aria-hidden
      data-testid="celebration"
      className={cn(
        'pointer-events-none absolute inset-0 flex items-center justify-center',
        className,
      )}
    >
      {PARTICLES.map((particle, index) => (
        <motion.span
          key={`${burst}-${index}`}
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: particle.color }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: particle.x, y: particle.y, scale: 1, opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
