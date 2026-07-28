// RN port of apps/web/src/components/settings/assistant-memory-card.tsx: the
// user-visible, user-clearable memory the assistant reads on every turn.
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Button, Card, Select, Switch, TextField } from '@/components/ui'
import { useSetAssistantProfile } from '@/lib/api/use-account'
import type { SessionUser } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'

type PersonDraft = { name: string; relationship: string }

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, '0')}:00`,
}))

// A whole-hour picker for a nullable local hour (0-23); the blank option maps
// back to null so the user can leave a routine unset.
function HourSelect({
  value,
  onChange,
  label,
  unsetLabel,
}: {
  value: number | null
  onChange: (value: number | null) => void
  label: string
  unsetLabel: string
}) {
  return (
    <Select
      className="flex-1"
      title={label}
      value={value === null ? '' : String(value)}
      placeholder={unsetLabel}
      options={[{ value: '', label: unsetLabel }, ...HOUR_OPTIONS]}
      onChange={next => onChange(next === '' ? null : Number(next))}
    />
  )
}

export function AssistantMemoryCard({ user }: { user: SessionUser }) {
  const { messages } = useI18n()
  const m = messages.assistantMemory
  const setProfile = useSetAssistantProfile()
  const profile = user.assistantProfile

  const [home, setHome] = useState(profile.homeLocation ?? '')
  const [work, setWork] = useState(profile.workLocation ?? '')
  const [wakeHour, setWakeHour] = useState<number | null>(profile.wakeHour)
  const [quietStart, setQuietStart] = useState<number | null>(
    profile.quietHoursStart,
  )
  const [quietEnd, setQuietEnd] = useState<number | null>(profile.quietHoursEnd)
  const [workStart, setWorkStart] = useState<number | null>(
    profile.workHoursStart,
  )
  const [workEnd, setWorkEnd] = useState<number | null>(profile.workHoursEnd)
  const [briefEnabled, setBriefEnabled] = useState(profile.briefEnabled)
  const [briefHour, setBriefHour] = useState<number | null>(profile.briefHour)
  const [nudgesEnabled, setNudgesEnabled] = useState(profile.nudgesEnabled)
  const [people, setPeople] = useState<PersonDraft[]>(
    profile.people.map(person => ({
      name: person.name,
      relationship: person.relationship ?? '',
    })),
  )
  const [notes, setNotes] = useState<string[]>([...profile.notes])
  const [noteDraft, setNoteDraft] = useState('')

  // The normalized payload the Save button would send, so we can both submit it
  // and diff it against what is saved to enable the button only when changed.
  const payload = useMemo(() => {
    const cleanPeople = people
      .map(person => ({
        name: person.name.trim(),
        relationship: person.relationship.trim(),
      }))
      .filter(person => person.name !== '')
      .map(person => ({
        name: person.name,
        relationship: person.relationship === '' ? null : person.relationship,
      }))
    return {
      homeLocation: home.trim() === '' ? null : home.trim(),
      workLocation: work.trim() === '' ? null : work.trim(),
      wakeHour,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
      workHoursStart: workStart,
      workHoursEnd: workEnd,
      briefEnabled,
      briefHour,
      nudgesEnabled,
      people: cleanPeople,
      notes,
    }
  }, [
    home,
    work,
    wakeHour,
    quietStart,
    quietEnd,
    workStart,
    workEnd,
    briefEnabled,
    briefHour,
    nudgesEnabled,
    people,
    notes,
  ])

  const saved = useMemo(
    () => ({
      homeLocation: profile.homeLocation,
      workLocation: profile.workLocation,
      wakeHour: profile.wakeHour,
      quietHoursStart: profile.quietHoursStart,
      quietHoursEnd: profile.quietHoursEnd,
      workHoursStart: profile.workHoursStart,
      workHoursEnd: profile.workHoursEnd,
      briefEnabled: profile.briefEnabled,
      briefHour: profile.briefHour,
      nudgesEnabled: profile.nudgesEnabled,
      people: profile.people,
      notes: profile.notes,
    }),
    [profile],
  )

  const dirty = JSON.stringify(payload) !== JSON.stringify(saved)
  // Overnight working hours are not supported yet, so the form blocks them
  // rather than letting the server reject the save.
  const workHoursInvalid =
    workStart !== null && workEnd !== null && workStart >= workEnd

  return (
    <Card className="gap-4 p-4">
      <View className="gap-1">
        <Text className="text-ink-900 text-sm font-semibold">
          {m.settingLabel}
        </Text>
        <Text className="text-ink-500 text-xs">{m.settingHint}</Text>
      </View>

      <TextField
        label={m.home}
        value={home}
        onChangeText={setHome}
        placeholder={m.homePlaceholder}
      />
      <Text className="text-ink-500 -mt-2 text-xs">{m.homeHint}</Text>

      <TextField
        label={m.work}
        value={work}
        onChangeText={setWork}
        placeholder={m.workPlaceholder}
      />

      <View className="gap-1.5">
        <Text className="text-ink-700 text-xs font-medium">{m.wakeHour}</Text>
        <View className="flex-row gap-2">
          <HourSelect
            value={wakeHour}
            onChange={setWakeHour}
            label={m.wakeHour}
            unsetLabel={m.hourUnset}
          />
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-ink-700 text-xs font-medium">{m.quietHours}</Text>
        <View className="flex-row items-center gap-2">
          <HourSelect
            value={quietStart}
            onChange={setQuietStart}
            label={m.rangeStart}
            unsetLabel={m.hourUnset}
          />
          <Text className="text-ink-500 text-xs">{m.quietTo}</Text>
          <HourSelect
            value={quietEnd}
            onChange={setQuietEnd}
            label={m.rangeEnd}
            unsetLabel={m.hourUnset}
          />
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-ink-700 text-xs font-medium">{m.workHours}</Text>
        <View className="flex-row items-center gap-2">
          <HourSelect
            value={workStart}
            onChange={setWorkStart}
            label={m.rangeStart}
            unsetLabel={m.hourUnset}
          />
          <Text className="text-ink-500 text-xs">{m.quietTo}</Text>
          <HourSelect
            value={workEnd}
            onChange={setWorkEnd}
            label={m.rangeEnd}
            unsetLabel={m.hourUnset}
          />
        </View>
        {workHoursInvalid ? (
          <Text className="text-danger text-xs">{m.workHoursInvalid}</Text>
        ) : null}
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-ink-700 flex-1 text-sm">{m.dailyBrief}</Text>
          <Switch
            value={briefEnabled}
            onValueChange={setBriefEnabled}
            accessibilityLabel={m.dailyBrief}
          />
        </View>
        <Text className="text-ink-500 text-xs">{m.dailyBriefHint}</Text>
        {briefEnabled ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-ink-700 text-xs">{m.briefHour}</Text>
            <HourSelect
              value={briefHour}
              onChange={setBriefHour}
              label={m.briefHour}
              unsetLabel={m.hourUnset}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-ink-700 flex-1 text-sm">{m.nudges}</Text>
          <Switch
            value={nudgesEnabled}
            onValueChange={setNudgesEnabled}
            accessibilityLabel={m.nudges}
          />
        </View>
        <Text className="text-ink-500 text-xs">{m.nudgesHint}</Text>
      </View>

      <View className="gap-2">
        <Text className="text-ink-700 text-xs font-medium">{m.people}</Text>
        <Text className="text-ink-500 text-xs">{m.peopleHint}</Text>
        {people.map((person, index) => (
          <View key={index} className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextField
                value={person.name}
                placeholder={m.personName}
                onChangeText={value =>
                  setPeople(current =>
                    current.map((item, position) =>
                      position === index ? { ...item, name: value } : item,
                    ),
                  )
                }
              />
            </View>
            <View className="flex-1">
              <TextField
                value={person.relationship}
                placeholder={m.personRelationship}
                onChangeText={value =>
                  setPeople(current =>
                    current.map((item, position) =>
                      position === index
                        ? { ...item, relationship: value }
                        : item,
                    ),
                  )
                }
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={m.remove}
              onPress={() =>
                setPeople(current =>
                  current.filter((_, position) => position !== index),
                )
              }
              className="h-11 justify-center px-2"
            >
              <Text className="text-ink-400 text-xs font-semibold">
                {m.remove}
              </Text>
            </Pressable>
          </View>
        ))}
        <Button
          variant="ghost"
          className="border-line self-start border"
          onPress={() =>
            setPeople(current => [...current, { name: '', relationship: '' }])
          }
        >
          {m.addPerson}
        </Button>
      </View>

      <View className="gap-2">
        <Text className="text-ink-700 text-xs font-medium">{m.notes}</Text>
        <Text className="text-ink-500 text-xs">{m.notesHint}</Text>
        {notes.map((note, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <Text className="text-ink-800 flex-1 text-sm">{note}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={m.remove}
              onPress={() =>
                setNotes(current =>
                  current.filter((_, position) => position !== index),
                )
              }
              className="px-2 py-1"
            >
              <Text className="text-ink-400 text-xs font-semibold">
                {m.remove}
              </Text>
            </Pressable>
          </View>
        ))}
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <TextField
              value={noteDraft}
              placeholder={m.notePlaceholder}
              onChangeText={setNoteDraft}
            />
          </View>
          <Button
            variant="ghost"
            className="border-line border"
            disabled={!noteDraft.trim()}
            onPress={() => {
              setNotes(current => [...current, noteDraft.trim()])
              setNoteDraft('')
            }}
          >
            {m.addNote}
          </Button>
        </View>
      </View>

      <Button
        disabled={!dirty || workHoursInvalid}
        isLoading={setProfile.isPending}
        onPress={() => setProfile.mutate(payload)}
      >
        {setProfile.isSuccess && !dirty ? m.saved : m.save}
      </Button>
    </Card>
  )
}
