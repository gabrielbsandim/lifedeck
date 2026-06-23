export type StoredFile = {
  url: string
}

export type UploadInput = {
  key: string
  data: Uint8Array
  contentType: string
}

export interface FileStorage {
  upload(input: UploadInput): Promise<StoredFile>
  remove(url: string): Promise<void>
}
