// lib/image-utils.ts

/**
 * Valida se uma URL de imagem é válida
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  if (url.trim() === '') return false
  
  // Aceita URLs do proxy, ui-avatars, ou Instagram
  return (
    url.startsWith('http://') || 
    url.startsWith('https://') || 
    url.startsWith('/api/image-proxy')
  )
}

/**
 * Processa URL de imagem do Instagram para usar no proxy
 * @param rawUrl - URL crua do Instagram (pode ter &amp;)
 * @param username - Username para fallback
 * @returns URL processada (proxy ou avatar genérico)
 */
export function processInstagramImageUrl(
  rawUrl: string | null | undefined, 
  username: string
): string {
  // Se URL é inválida, retorna avatar genérico DIRETO
  if (!isValidImageUrl(rawUrl)) {
    console.warn(`⚠️ URL inválida para @${username}, usando avatar genérico`)
    return getGenericAvatar(username)
  }
  
  const url = rawUrl!.trim()
  
  // Se já é um avatar genérico, retorna direto
  if (url.includes('ui-avatars.com')) {
    return url
  }
  
  // Se já é um proxy, retorna direto
  if (url.startsWith('/api/image-proxy')) {
    return url
  }
  
  // Se é URL do Instagram, passa pelo proxy
  if (url.includes('instagram') || url.includes('fbcdn')) {
    // 🔥 IMPORTANTE: Limpar &amp; antes de encodar
    const cleanUrl = url.replace(/&amp;/g, '&')
    return `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}&username=${encodeURIComponent(username)}`
  }
  
  // URL externa desconhecida, retorna direto
  return url
}

/**
 * Gera URL de avatar genérico
 */
export function getGenericAvatar(username: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
}

/**
 * Handler de erro de imagem para usar no onError
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>, 
  username: string
): void {
  const img = event.currentTarget
  
  // Evitar loop infinito
  if (img.src.includes('ui-avatars.com')) {
    console.error(`❌ Avatar genérico também falhou para @${username}`)
    return
  }
  
  console.warn(`⚠️ Imagem quebrada para @${username}, usando fallback`)
  img.src = getGenericAvatar(username)
}