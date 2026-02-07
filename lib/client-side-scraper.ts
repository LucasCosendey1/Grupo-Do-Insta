// lib/client-side-scraper.ts
// 🌐 Scraping no navegador do usuário (usa o IP dele)

export interface InstagramProfile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  following: number
  posts: number
  biography: string
  isPrivate: boolean
  isVerified: boolean
}

/**
 * ESTRATÉGIA 1: Fetch direto do navegador usando API pública
 * Bypassa CORS usando proxy CORS público
 */
async function tryDirectFetch(username: string): Promise<InstagramProfile | null> {
  try {
    console.log('🌐 [CLIENT] Tentando fetch direto...')
    
    // Usar CORS proxy para bypassar restrições
    const corsProxy = 'https://api.allorigins.win/raw?url='
    const instagramUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`
    
    const response = await fetch(corsProxy + encodeURIComponent(instagramUrl), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.graphql?.user || data.user) {
      const user = data.graphql?.user || data.user
      
      console.log('✅ [CLIENT] Dados obtidos via fetch direto!')
      
      return {
        username: user.username,
        fullName: user.full_name || user.username,
        profilePic: user.profile_pic_url_hd || user.profile_pic_url,
        followers: user.edge_followed_by?.count || user.follower_count || 0,
        following: user.edge_follow?.count || user.following_count || 0,
        posts: user.edge_owner_to_timeline_media?.count || user.media_count || 0,
        biography: user.biography || '',
        isPrivate: user.is_private || false,
        isVerified: user.is_verified || false
      }
    }
    
    throw new Error('Estrutura inesperada')
    
  } catch (error) {
    console.log('❌ [CLIENT] Fetch direto falhou:', error)
    return null
  }
}

/**
 * ESTRATÉGIA 2: Scraping HTML via CORS Proxy
 * Usa o IP do usuário através do proxy
 */
async function tryHTMLScraping(username: string): Promise<InstagramProfile | null> {
  try {
    console.log('📄 [CLIENT] Tentando scraping HTML...')
    
    const corsProxy = 'https://api.allorigins.win/get?url='
    const instagramUrl = `https://www.instagram.com/${username}/`
    
    const response = await fetch(corsProxy + encodeURIComponent(instagramUrl))
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const html = data.contents
    
    // Extrair dados do HTML
    const profile = extractFromHTML(html, username)
    
    if (profile && profile.followers >= 0) {
      console.log('✅ [CLIENT] Dados extraídos do HTML!')
      return profile
    }
    
    throw new Error('Dados não encontrados')
    
  } catch (error) {
    console.log('❌ [CLIENT] HTML scraping falhou:', error)
    return null
  }
}

/**
 * ESTRATÉGIA 3: API via servidor (fallback)
 * Só usa se client-side falhar
 */
async function tryServerAPI(username: string): Promise<InstagramProfile | null> {
  try {
    console.log('🔧 [CLIENT] Tentando via servidor (fallback)...')
    
    const response = await fetch(`/api/scrape?username=${encodeURIComponent(username)}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }
    
    console.log('✅ [CLIENT] Dados obtidos via servidor!')
    
    return {
      username: data.username,
      fullName: data.fullName,
      profilePic: data.profilePic,
      followers: data.followers || 0,
      following: data.following || 0,
      posts: data.posts || 0,
      biography: data.biography || '',
      isPrivate: data.isPrivate || false,
      isVerified: data.isVerified || false
    }
    
  } catch (error) {
    console.log('❌ [CLIENT] Servidor falhou:', error)
    return null
  }
}

/**
 * Extrai dados do HTML
 */
function extractFromHTML(html: string, username: string): InstagramProfile {
  const profile: InstagramProfile = {
    username,
    fullName: username,
    profilePic: '',
    followers: 0,
    following: 0,
    posts: 0,
    biography: '',
    isPrivate: false,
    isVerified: false
  }
  
  try {
    // Buscar JSON embutido
    const scriptMatches = html.match(/<script type="application\/json"[^>]*>({.*?})<\/script>/gs)
    
    if (scriptMatches) {
      for (const match of scriptMatches) {
        try {
          const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
          const json = JSON.parse(jsonStr)
          
          const user = findUserInJSON(json)
          
          if (user) {
            profile.fullName = user.full_name || user.fullName || username
            profile.profilePic = user.profile_pic_url_hd || user.profile_pic_url || user.profilePicUrl || ''
            profile.followers = user.edge_followed_by?.count || user.follower_count || user.followersCount || 0
            profile.following = user.edge_follow?.count || user.following_count || user.followingCount || 0
            profile.posts = user.edge_owner_to_timeline_media?.count || user.media_count || user.mediaCount || 0
            profile.biography = user.biography || user.bio || ''
            profile.isPrivate = user.is_private || user.isPrivate || false
            profile.isVerified = user.is_verified || user.isVerified || false
            
            if (profile.followers > 0) break
          }
        } catch (e) {
          continue
        }
      }
    }
    
    // Se não encontrou, tentar meta tags
    if (!profile.profilePic) {
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
      if (imageMatch) profile.profilePic = imageMatch[1]
    }
    
    if (profile.fullName === username) {
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
      if (titleMatch) {
        const nameMatch = titleMatch[1].match(/^(.+?)\s*\(@/)
        if (nameMatch) profile.fullName = nameMatch[1].trim()
      }
    }
    
  } catch (error) {
    console.error('Erro ao extrair HTML:', error)
  }
  
  return profile
}

/**
 * Busca recursiva no JSON
 */
function findUserInJSON(obj: any, depth = 0): any {
  if (depth > 15) return null
  if (!obj || typeof obj !== 'object') return null
  
  if (obj.username && (obj.edge_followed_by || obj.follower_count !== undefined || obj.profile_pic_url)) {
    return obj
  }
  
  const priorityPaths = ['user', 'data.user', 'graphql.user']
  for (const path of priorityPaths) {
    const parts = path.split('.')
    let current = obj
    for (const part of parts) {
      current = current?.[part]
    }
    if (current?.username) {
      return current
    }
  }
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findUserInJSON(obj[key], depth + 1)
      if (result) return result
    }
  }
  
  return null
}

/**
 * FUNÇÃO PRINCIPAL: Busca perfil usando IP do usuário
 */
export async function searchInstagramProfile(username: string): Promise<InstagramProfile | null> {
  const cleanUsername = username.replace('@', '').trim().toLowerCase()
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 SCRAPING CLIENT-SIDE (IP do Usuário)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 Username:', cleanUsername)
  console.log('🌐 IP usado: IP do navegador do usuário')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  // Tentar estratégias em ordem
  let profile = await tryDirectFetch(cleanUsername)
  
  if (!profile) {
    console.log('🔄 Estratégia 1 falhou, tentando 2...\n')
    profile = await tryHTMLScraping(cleanUsername)
  }
  
  if (!profile) {
    console.log('🔄 Estratégia 2 falhou, tentando 3...\n')
    profile = await tryServerAPI(cleanUsername)
  }
  
  if (profile) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 Username:', profile.username)
    console.log('📝 Nome:', profile.fullName)
    console.log('📊 Seguidores:', profile.followers)
    console.log('🖼️  Foto:', profile.profilePic ? 'SIM' : 'NÃO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } else {
    console.log('\n❌ Todas as estratégias falharam\n')
  }
  
  return profile
}

/**
 * Versão com cache para evitar requisições repetidas
 */
export async function searchInstagramProfileCached(username: string): Promise<InstagramProfile | null> {
  const cleanUsername = username.replace('@', '').trim().toLowerCase()
  const cacheKey = `ig_profile_${cleanUsername}`
  const cacheDuration = 5 * 60 * 1000 // 5 minutos
  
  // Tentar pegar do cache
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const data = JSON.parse(cached)
      const age = Date.now() - data.cachedAt
      
      if (age < cacheDuration) {
        console.log('✅ [CACHE] Usando dados do cache:', cleanUsername)
        return data.profile
      }
    }
  } catch (error) {
    console.log('⚠️ [CACHE] Erro ao ler cache:', error)
  }
  
  // Buscar novos dados
  const profile = await searchInstagramProfile(cleanUsername)
  
  // Salvar no cache
  if (profile) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        profile,
        cachedAt: Date.now()
      }))
      console.log('💾 [CACHE] Dados salvos no cache')
    } catch (error) {
      console.log('⚠️ [CACHE] Erro ao salvar cache:', error)
    }
  }
  
  return profile
}