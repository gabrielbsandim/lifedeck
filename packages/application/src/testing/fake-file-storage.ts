import type { FileStorage, StoredFile, UploadInput } from '@/ports/file-storage'

export class FakeFileStorage implements FileStorage {
  readonly uploaded: UploadInput[] = []
  readonly removed: string[] = []
  private counter = 0

  constructor(private readonly baseUrl = 'https://blob.test') {}

  async upload(input: UploadInput): Promise<StoredFile> {
    this.uploaded.push(input)
    this.counter += 1
    return { url: `${this.baseUrl}/${input.key}?v=${this.counter}` }
  }

  async remove(url: string): Promise<void> {
    this.removed.push(url)
  }
}
