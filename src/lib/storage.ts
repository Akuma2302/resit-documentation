import { getStore } from '@netlify/blobs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

// Receipt images live in Netlify Blobs when deployed. Outside Netlify (plain `npm run dev`)
// there is no Blobs environment, so they fall back to the local uploads/ folder.

const LOCAL_DIR = path.join(process.cwd(), 'uploads')

function blobStore() {
  try {
    return getStore({ name: 'receipts', consistency: 'strong' })
  } catch (error) {
    if (error instanceof Error && error.name === 'MissingBlobsEnvironmentError') return null
    throw error
  }
}

export async function putImage(name: string, data: ArrayBuffer) {
  const store = blobStore()
  if (store) {
    await store.set(name, data)
    return
  }
  await mkdir(LOCAL_DIR, { recursive: true })
  await writeFile(path.join(LOCAL_DIR, name), Buffer.from(data))
}

export async function getImage(name: string): Promise<ArrayBuffer | null> {
  // basename guards against a stored name ever pointing outside the store
  const key = path.basename(name)
  const store = blobStore()
  if (store) return store.get(key, { type: 'arrayBuffer' })
  try {
    const file = await readFile(path.join(LOCAL_DIR, key))
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
  } catch {
    return null
  }
}
