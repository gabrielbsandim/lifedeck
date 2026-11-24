import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import { getSessionToken } from '@/lib/api/session-token'

const EXPORT_FILE = 'lifedeck-export.json'

/**
 * Downloads the account export with the app's own session and hands the file
 * to the system share sheet (Files, Drive, mail). The browser cannot do this:
 * it has no session, so the export route answered it with a 401.
 */
export async function shareDataExport(dialogTitle: string): Promise<void> {
  const token = await getSessionToken()
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/account/export`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    throw new Error(`Export failed with ${response.status}.`)
  }
  const file = new File(Paths.cache, EXPORT_FILE)
  if (file.exists) {
    file.delete()
  }
  file.create()
  file.write(await response.text())
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle,
  })
}
