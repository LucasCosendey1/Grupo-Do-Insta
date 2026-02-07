// lib/search-cache-system.ts
// Sistema de cache inteligente para buscas do Instagram

interface CachedProfile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  isVerified: boolean
  following: number
  posts: number
  biography: string
  isPrivate: boolean
  cachedAt: number  // timestamp
}

const CACHE_DURATION = 5 * 60 * 1000  // 5 minutos
const CACHE_KEY_PREFIX = 'ig_profile_'

/**
 * Busca perfil com cache inteligente
 * Evita requisições repetidas ao Instagram
 */
export async function searchProfileWithCache(username: string): Promise<CachedProfile | null> {
  const cleanUsername = username.replace('@', '').trim().toLowerCase()
  const cacheKey = `${CACHE_KEY_PREFIX}${cleanUsername}`
  
  // 1. Tentar pegar do cache
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log('✅ [CACHE] Perfil encontrado no cache:', cleanUsername)
    return cached
  }
  
  // 2. Não está em cache, buscar do Instagram
  console.log('🔍 [API] Buscando do Instagram:', cleanUsername)
  
  try {
    const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUsername)}`)
    
    if (!response.ok) {
      console.error('❌ [API] Falha no scraping:', response.status)
      return null
    }
    
    const data = await response.json()
    
    const profile: CachedProfile = {
      username: data.username,
      fullName: data.fullName || data.username,
      profilePic: data.profilePic,
      followers: data.followers || 0,
      following: data.following || 0,
      posts: data.posts || 0,
      biography: data.biography || '',
      isPrivate: data.isPrivate || false,
      isVerified: data.isVerified || false,
      cachedAt: Date.now()
    }
    
    // 3. Salvar no cache
    saveToCache(cacheKey, profile)
    
    console.log('✅ [CACHE] Perfil salvo no cache:', cleanUsername)
    return profile
    
  } catch (error) {
    console.error('❌ [API] Erro ao buscar perfil:', error)
    return null
  }
}

/**
 * Pega perfil do cache se ainda estiver válido
 */
function getFromCache(key: string): CachedProfile | null {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    
    const profile: CachedProfile = JSON.parse(cached)
    
    // Verificar se cache expirou
    const age = Date.now() - profile.cachedAt
    if (age > CACHE_DURATION) {
      console.log('⏰ [CACHE] Cache expirado, removendo:', key)
      localStorage.removeItem(key)
      return null
    }
    
    return profile
    
  } catch (error) {
    console.error('❌ [CACHE] Erro ao ler cache:', error)
    return null
  }
}

/**
 * Salva perfil no cache
 */
function saveToCache(key: string, profile: CachedProfile): void {
  try {
    localStorage.setItem(key, JSON.stringify(profile))
  } catch (error) {
    console.error('❌ [CACHE] Erro ao salvar cache:', error)
  }
}

/**
 * Limpa todo o cache de perfis
 */
export function clearProfileCache(): void {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
    console.log('🗑️ [CACHE] Cache de perfis limpo')
  } catch (error) {
    console.error('❌ [CACHE] Erro ao limpar cache:', error)
  }
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): { total: number; expired: number } {
  try {
    const keys = Object.keys(localStorage)
    const profileKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX))
    
    let expired = 0
    profileKeys.forEach(key => {
      const cached = localStorage.getItem(key)
      if (cached) {
        const profile: CachedProfile = JSON.parse(cached)
        const age = Date.now() - profile.cachedAt
        if (age > CACHE_DURATION) expired++
      }
    })
    
    return { total: profileKeys.length, expired }
    
  } catch (error) {
    return { total: 0, expired: 0 }
  }
}