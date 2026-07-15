'use client'

import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type PointerActivationConstraint,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

type TaskDragListProps<T> = {
  items: T[]
  getId: (item: T) => string
  onReorder: (ids: string[]) => void
  renderItem: (item: T, opts: { overlay: boolean }) => ReactNode
  className?: string
  // When the whole item is the drag handle (no separate grip), a short press
  // delay lets taps through to interactive children and only reorders on hold.
  activationConstraint?: PointerActivationConstraint
}

// A calm settle: the dragged overlay eases into the opened slot instead of
// snapping. The placeholder underneath fades back in over the same beat.
const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } },
  }),
}

export function TaskDragList<T>({
  items,
  getId,
  onReorder,
  renderItem,
  className,
  activationConstraint = { distance: 6 },
}: TaskDragListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    // A small activation distance (or press delay) lets taps/clicks through to
    // interactive children and only starts a drag once the constraint is met.
    useSensor(PointerSensor, { activationConstraint }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const ids = items.map(getId)
  const activeItem =
    activeId !== null
      ? (items.find(item => getId(item) === activeId) ?? null)
      : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) {
      return
    }
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map(item => renderItem(item, { overlay: false }))}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? renderItem(activeItem, { overlay: true }) : null}
      </DragOverlay>
    </DndContext>
  )
}
