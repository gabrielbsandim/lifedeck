// Voice notes for the assistant chat.
//
// The web records with MediaRecorder into a Blob; on native expo-audio writes
// to a file and hands back its URI, which RN's FormData uploads directly. The
// surface here mirrors the web's start/stop(shouldDeliver) contract so the chat
// screen reads the same on both platforms.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import type { AssistantFile } from '@/lib/api/use-assistant'

export type VoiceRecorder = {
  recording: boolean
  elapsed: number
  /** Resolves false when the microphone permission was denied. */
  start: () => Promise<boolean>
  /** Returns the recorded file, or null when discarded or empty. */
  stop: (shouldDeliver: boolean) => Promise<AssistantFile | null>
}

export function useVoiceRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const start = useCallback(async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync()
    if (!permission.granted) {
      return false
    }
    // iOS refuses to record until the session is switched out of playback mode.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    setRecording(true)
    setElapsed(0)
    timer.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return true
  }, [recorder])

  const stop = useCallback(
    async (shouldDeliver: boolean) => {
      clearTimer()
      setRecording(false)
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false })
      const uri = recorder.uri
      if (!shouldDeliver || !uri) {
        return null
      }
      return {
        uri,
        name: 'note.m4a',
        mimeType: 'audio/m4a',
      }
    },
    [clearTimer, recorder],
  )

  return { recording, elapsed, start, stop }
}
