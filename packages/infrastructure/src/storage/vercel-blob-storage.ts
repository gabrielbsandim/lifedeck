import { del, put } from '@vercel/blob'
import type {
  FileStorage,
  StoredFile,
  UploadInput,
} from '@lifedeck/application'

export class VercelBlobStorage implements FileStorage {
  constructor(private readonly token = process.env.BLOB_READ_WRITE_TOKEN) {}

  async upload(input: UploadInput): Promise<StoredFile> {
    const blob = await put(input.key, Buffer.from(input.data), {
      access: 'public',
      contentType: input.contentType,
      addRandomSuffix: true,
      token: this.token,
    })
    return { url: blob.url }
  }

  async remove(url: string): Promise<void> {
    await del(url, { token: this.token })
  }
}
