// lib/image-utils.ts

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  if (url.trim() === '') return false
  
  return (
    url.startsWith('http://') || 
    url.startsWith('https://') || 
    url.startsWith('/api/image-proxy')
  )
}

function isInstagramCDN(url: string): boolean {
  const cdnPatterns = [
    'instagram.com',
    'cdninstagram.com',
    'fbcdn.net',
    'scontent',      // ← CRÍTICO!
    'scontent-',
    'scontent.',
  ]
  
  const lowerUrl = url.toLowerCase()
  return cdnPatterns.some(pattern => lowerUrl.includes(pattern))
}

export function processInstagramImageUrl(
  rawUrl: string | null | undefined, 
  username: string
): string {
  if (!isValidImageUrl(rawUrl)) {
    console.warn(`⚠️ URL inválida para @${username}`)
    return getGenericAvatar(username)
  }
  
  const url = rawUrl!.trim()
  
  if (url.includes('ui-avatars.com')) {
    return url
  }
  
  if (url.startsWith('/api/image-proxy')) {
    return url
  }
  
  // 🔥 CORREÇÃO: Detecta scontent
  if (isInstagramCDN(url)) {
    const cleanUrl = url.replace(/&amp;/g, '&')
    console.log(`✅ [PROXY] Detectou CDN para @${username}`)
    return `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}&username=${encodeURIComponent(username)}`
  }
  
  return url
}

export function getGenericAvatar(username: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
}

export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>, 
  username: string
): void {
  const img = event.currentTarget
  
  if (img.src.includes('ui-avatars.com')) {
    console.error(`❌ Avatar genérico falhou para @${username}`)
    return
  }
  
  console.warn(`⚠️ Imagem quebrada para @${username}`)
  img.src = getGenericAvatar(username)
}