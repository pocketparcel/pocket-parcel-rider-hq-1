const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])

export function fileToBase64DataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

export async function readImageFileAsBase64(file) {
  if (!file) {
    throw new Error('No file selected')
  }
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Please upload a JPEG, PNG, or WebP image')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image must be 8 MB or smaller')
  }
  return fileToBase64DataUrl(file)
}
