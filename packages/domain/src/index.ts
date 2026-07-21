export { DomainError, ValidationError } from '@/shared/domain-error'
export { guard } from '@/shared/guard'
export { asEntityId, type EntityId } from '@/shared/id'
export { Email } from '@/value-objects/email'
export {
  MESSAGE_LANGUAGES,
  detectMessageLanguage,
  toMessageLanguage,
  type MessageLanguage,
} from '@/value-objects/message-language'
export {
  TASK_STATUSES,
  isTaskStatus,
  type TaskStatus,
} from '@/value-objects/task-status'
export {
  LIST_TYPES,
  isListType,
  type ListType,
} from '@/value-objects/list-type'
export {
  VISIBILITIES,
  isVisibility,
  type Visibility,
} from '@/value-objects/visibility'
export {
  MEMBER_ROLES,
  isMemberRole,
  type MemberRole,
} from '@/value-objects/member-role'
export {
  RECURRENCE_FREQUENCIES,
  validateRecurrenceRule,
  occursOn,
  occurrencesBetween,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from '@/value-objects/recurrence-rule'
export {
  HABIT_CADENCE_KINDS,
  validateHabitCadence,
  isHabitScheduledOn,
  weekdayOfCivilDate,
  computeHabitStreak,
  type HabitCadence,
  type HabitCadenceKind,
} from '@/value-objects/habit-cadence'
export {
  CARRY_OVER_MODES,
  isCarryOverMode,
  type CarryOverMode,
} from '@/value-objects/carry-over-mode'
export {
  EMPTY_ASSISTANT_PROFILE,
  MAX_PEOPLE,
  MAX_NOTES,
  MAX_NOTE_LENGTH,
  MAX_PROFILE_LOCATION_LENGTH,
  applyAssistantProfilePatch,
  appendAssistantNote,
  removeAssistantNote,
  sanitizeAssistantProfile,
  isAssistantProfileEmpty,
  summarizeAssistantProfile,
  type AssistantProfile,
  type AssistantProfilePatch,
  type AssistantPerson,
} from '@/value-objects/assistant-profile'
export {
  ENTITLEMENTS,
  isEntitlement,
  type Entitlement,
} from '@/value-objects/entitlement'
export {
  PLANS,
  DEFAULT_PLAN,
  isPlan,
  planRank,
  entitlementsForPlan,
  planGrants,
  quotaForPlan,
  type Plan,
  type PlanQuota,
} from '@/value-objects/plan'
export {
  SUBSCRIPTION_STATUSES,
  isSubscriptionStatus,
  type SubscriptionStatus,
} from '@/value-objects/subscription-status'
export {
  PAYMENT_PROVIDERS,
  isPaymentProvider,
  type PaymentProvider,
} from '@/value-objects/payment-provider'
export {
  AI_OPERATIONS,
  isAiOperation,
  creditCostOf,
  type AiOperation,
} from '@/value-objects/ai-operation'
export {
  DEFAULT_TIME_ZONE,
  isTimeZone,
  civilDate,
  civilHour,
  startOfCivilDay,
  zoneOffset,
  zonedIso,
  zonedInstant,
  zonedWeekday,
} from '@/value-objects/time-zone'
export {
  findFreeSlots,
  subtractIntervals,
  type TimeInterval,
  type FindFreeSlotsParams,
} from '@/value-objects/free-slots'
export { Task, type TaskProps } from '@/entities/task'
export {
  Subtask,
  areAllSubtasksCompleted,
  type SubtaskProps,
} from '@/entities/subtask'
export { User, type UserProps } from '@/entities/user'
export { List, type ListProps } from '@/entities/list'
export {
  RecurringTask,
  type RecurringTaskProps,
} from '@/entities/recurring-task'
export { Habit, type HabitProps } from '@/entities/habit'
export { HabitLog, type HabitLogProps } from '@/entities/habit-log'
export { ShareLink, type ShareLinkProps } from '@/entities/share-link'
export { ListMember, type ListMemberProps } from '@/entities/list-member'
export {
  EmailVerification,
  type EmailVerificationProps,
} from '@/entities/email-verification'
export { Notification, type NotificationProps } from '@/entities/notification'
export {
  ScheduledJob,
  SCHEDULED_JOB_STATUSES,
  type ScheduledJobStatus,
  type ScheduledJobProps,
} from '@/entities/scheduled-job'
export { Subscription, type SubscriptionProps } from '@/entities/subscription'
export {
  CheckoutIntent,
  type CheckoutIntentProps,
} from '@/entities/checkout-intent'
export {
  BillingCustomer,
  type BillingCustomerProps,
} from '@/entities/billing-customer'
export { isValidCpf, normalizeCpf } from '@/value-objects/cpf'
export { UsageEvent, type UsageEventProps } from '@/entities/usage-event'
export {
  CalendarEvent,
  type CalendarEventProps,
} from '@/entities/calendar-event'
export {
  CALENDAR_EVENT_SOURCES,
  isCalendarEventSource,
  type CalendarEventSource,
} from '@/value-objects/calendar-event-source'
export {
  CALENDAR_PROVIDERS,
  isCalendarProvider,
  type CalendarProviderName,
} from '@/value-objects/calendar-provider'
export {
  CalendarConnection,
  type CalendarConnectionProps,
} from '@/entities/calendar-connection'
export {
  MESSAGE_CHANNELS,
  isMessageChannel,
  type MessageChannel,
} from '@/value-objects/message-channel'
export { isE164, normalizePhone } from '@/value-objects/phone-number'
export {
  ChannelIdentity,
  type ChannelIdentityProps,
} from '@/entities/channel-identity'
export {
  API_SCOPES,
  isApiScope,
  type ApiScope,
} from '@/value-objects/api-scope'
export {
  ApiKey,
  API_KEY_NAME_MAX_LENGTH,
  type ApiKeyProps,
} from '@/entities/api-key'
