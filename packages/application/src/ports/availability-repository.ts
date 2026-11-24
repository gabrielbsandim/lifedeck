import type {
  AvailabilityOverride,
  EntityId,
  WeeklyWindow,
} from '@lifedeck/domain'

export interface AvailabilityRepository {
  getWeekly(pageId: EntityId): Promise<WeeklyWindow[]>
  replaceWeekly(pageId: EntityId, windows: WeeklyWindow[]): Promise<void>
  /** Civil dates `YYYY-MM-DD`, both ends inclusive. */
  listOverrides(
    pageId: EntityId,
    fromDate: string,
    toDate: string,
  ): Promise<AvailabilityOverride[]>
  saveOverride(pageId: EntityId, override: AvailabilityOverride): Promise<void>
  deleteOverride(pageId: EntityId, date: string): Promise<void>
}
