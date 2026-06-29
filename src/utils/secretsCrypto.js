const ENCRYPTED_PREFIX = 'enc:v1:'
const ALGORITHM = 'AES-GCM'
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

function resolveEncryptionKeyMaterial() {
  const key = String(import.meta.env.VITE_SECRETS_ENCRYPTION_KEY || '').trim()
  if (!key) {
    throw new Error('VITE_SECRETS_ENCRYPTION_KEY is not configured')
  }
  return key
}

function toBase64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (padded.length % 4)) % 4)
  const binary = atob(padded + padding)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function deriveCryptoKey() {
  const material = resolveEncryptionKeyMaterial()
  const encoded = new TextEncoder().encode(material)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return crypto.subtle.importKey('raw', hash, { name: ALGORITHM }, false, ['encrypt', 'decrypt'])
}

export function isEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX)
}

export async function encryptSecret(plaintext) {
  const value = String(plaintext ?? '')
  if (!value) return ''

  const key = await deriveCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const encoded = new TextEncoder().encode(value)
  const combined = new Uint8Array(await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded))
  const authTag = combined.slice(-AUTH_TAG_BYTES)
  const ciphertext = combined.slice(0, -AUTH_TAG_BYTES)
  const packed = new Uint8Array(IV_BYTES + AUTH_TAG_BYTES + ciphertext.length)
  packed.set(iv, 0)
  packed.set(authTag, IV_BYTES)
  packed.set(ciphertext, IV_BYTES + AUTH_TAG_BYTES)
  return `${ENCRYPTED_PREFIX}${toBase64Url(packed)}`
}

export async function decryptSecret(payload) {
  const value = String(payload ?? '').trim()
  if (!value) return ''
  if (!isEncryptedSecret(value)) {
    throw new Error('Invalid encrypted secret payload')
  }

  const packed = fromBase64Url(value.slice(ENCRYPTED_PREFIX.length))
  if (packed.length <= IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error('Encrypted secret payload is too short')
  }

  const iv = packed.slice(0, IV_BYTES)
  const authTag = packed.slice(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES)
  const ciphertext = packed.slice(IV_BYTES + AUTH_TAG_BYTES)
  const combined = new Uint8Array(ciphertext.length + AUTH_TAG_BYTES)
  combined.set(ciphertext, 0)
  combined.set(authTag, ciphertext.length)

  const key = await deriveCryptoKey()
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, combined)
  return new TextDecoder().decode(decrypted)
}

export function maskSecret(plaintext) {
  const value = String(plaintext ?? '')
  if (!value) return ''
  if (value.length <= 4) return '••••'
  return `••••${value.slice(-4)}`
}

export function shortenEncryptedPayload(payload, visible = 18) {
  const value = String(payload ?? '')
  if (!value) return ''
  if (value.length <= visible + 8) return value
  return `${value.slice(0, visible)}…${value.slice(-8)}`
}
