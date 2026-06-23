'use client'

import type { ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

type TaskDragListProps = {
  ids: string[]
  onReorder: (ids: string[]) => void
  children: ReactNode
  className?: string
}

/**
 * Wraps a vertical list of sortable rows with drag-and-drop reordering.
 * Each child row drives its own grip handle via `useSortable(id)`; this
 * component owns the sensors and computes the new order on drop.
 */
export function TaskDragList({
  ids,
  onReorder,
  children,
  className,
}: TaskDragListProps) {
  const sensors = useSensors(
    // A small activation distance lets taps/clicks through to the checkbox
    // and only starts a drag once the pointer actually moves.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
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
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>{children}</ul>
      </SortableContext>
    </DndContext>
  )
}
