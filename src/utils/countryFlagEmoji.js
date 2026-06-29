export function isoCodeToFlagEmoji(code) {
  const normalized = (code || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalized)) {
    return null
  }
  return String.fromCodePoint(...[...normalized].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65))
}

export function resolveFlagEmoji(flagEmoji, countryCode) {
  const raw = (flagEmoji || '').trim()
  if (!raw) {
    return isoCodeToFlagEmoji(countryCode) || raw
  }
  const fromInput = isoCodeToFlagEmoji(raw)
  if (fromInput) {
    return fromInput
  }
  return raw
}
