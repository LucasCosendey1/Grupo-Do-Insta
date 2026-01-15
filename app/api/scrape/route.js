// 🚀 VERSÃO 3: Scraping Híbrido com Múltiplas Fontes
// Tenta várias APIs e métodos até conseguir os dados

/**
 * ESTRATÉGIA 1: Instagram Web Profile Info API (requer apenas user agent mobile)
 */
async function tryWebProfileAPI(username) {
  try {
    console.log('📱 [API-WEB] Tentando Web Profile API...')
    
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)',
        'X-IG-App-ID': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    })
    
    console.log('📡 [API-WEB] Status:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.data && data.data.user) {
      const user = data.data.user
      console.log('✅ [API-WEB] Dados obtidos!')
      
      return {
        username: user.username,
        fullName: user.full_name || user.username,
        profilePic: user.profile_pic_url_hd || user.profile_pic_url,
        followers: user.edge_followed_by?.count || 0,
        following: user.edge_follow?.count || 0,
        posts: user.edge_owner_to_timeline_media?.count || 0,
        biography: user.biography || '',
        isPrivate: user.is_private || false,
        isVerified: user.is_verified || false
      }
    }
    
    throw new Error('Estrutura de resposta inesperada')
    
  } catch (error) {
    console.log('❌ [API-WEB] Falhou:', error.message)
    return null
  }
}

/**
 * ESTRATÉGIA 2: Página HTML pública (método atual)
 */
async function tryPublicHTML(username) {
  try {
    console.log('🌐 [HTML] Tentando scraping de HTML público...')
    
    const url = `https://www.instagram.com/${username}/`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    console.log('📄 [HTML] Recebido, tamanho:', html.length)
    
    // Tentar extrair via regex direto
    const data = extractFromHTML(html, username)
    
    if (data && data.followers > 0) {
      console.log('✅ [HTML] Dados extraídos com sucesso!')
      return data
    }
    
    throw new Error('Não encontrou dados no HTML')
    
  } catch (error) {
    console.log('❌ [HTML] Falhou:', error.message)
    return null
  }
}

/**
 * Extrai dados diretamente do HTML
 */
function extractFromHTML(html, username) {
  const data = {
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
  
  // Buscar JSON embutido
  const jsonMatches = html.match(/<script type="application\/json"[^>]*>({.*?})<\/script>/gs)
  
  if (jsonMatches) {
    for (const match of jsonMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
        const json = JSON.parse(jsonStr)
        
        const user = findUserInJSON(json)
        if (user) {
          data.fullName = user.full_name || username
          data.profilePic = user.profile_pic_url_hd || user.profile_pic_url || ''
          data.followers = user.edge_followed_by?.count || user.follower_count || 0
          data.following = user.edge_follow?.count || user.following_count || 0
          data.posts = user.edge_owner_to_timeline_media?.count || user.media_count || 0
          data.biography = user.biography || ''
          data.isPrivate = user.is_private || false
          data.isVerified = user.is_verified || false
          
          if (data.followers > 0) break
        }
      } catch (e) {
        continue
      }
    }
  }
  
  // Se não encontrou no JSON, buscar direto no HTML
  if (data.followers === 0) {
    const patterns = [
      /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
      /"follower_count"\s*:\s*(\d+)/,
      /"followers"?\s*:\s*(\d+)/
    ]
    
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        data.followers = parseInt(match[1], 10)
        console.log('✅ Followers encontrados:', data.followers)
        break
      }
    }
  }
  
  if (data.following === 0) {
    const match = html.match(/"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/)
    if (match) data.following = parseInt(match[1], 10)
  }
  
  if (data.posts === 0) {
    const match = html.match(/"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/)
    if (match) data.posts = parseInt(match[1], 10)
  }
  
  if (!data.profilePic) {
    const match = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (match) data.profilePic = match[1]
  }
  
  return data
}

function findUserInJSON(obj, depth = 0) {
  if (depth > 12) return null
  
  if (obj && typeof obj === 'object') {
    if (obj.username && (obj.edge_followed_by || obj.follower_count !== undefined)) {
      return obj
    }
    
    if (obj.user) return findUserInJSON(obj.user, depth + 1)
    if (obj.graphql?.user) return obj.graphql.user
    if (obj.data?.user) return obj.data.user
    
    for (const key in obj) {
      const result = findUserInJSON(obj[key], depth + 1)
      if (result) return result
    }
  }
  
  return null
}

/**
 * HANDLER PRINCIPAL - tenta todas as estratégias
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  console.log('\n🎯 ===== NOVA REQUISIÇÃO =====')
  console.log('Username:', username)
  console.log('Timestamp:', new Date().toISOString())

  if (!username) {
    return Response.json({ error: 'Username não fornecido' }, { status: 400 })
  }

  try {
    // Tentar Estratégia 1: API Web Profile
    let userData = await tryWebProfileAPI(username)
    
    // Tentar Estratégia 2: HTML Público
    if (!userData || userData.followers === 0) {
      console.log('⚠️ Estratégia 1 falhou, tentando estratégia 2...')
      userData = await tryPublicHTML(username)
    }
    
    if (!userData) {
      throw new Error('Todas as estratégias falharam')
    }
    
    console.log('✅ Perfil encontrado:', userData.username)
    console.log('📊 Stats:', {
      followers: userData.followers,
      following: userData.following,
      posts: userData.posts
    })
    
    // Processar foto com proxy
    const profilePicUrl = userData.profilePic ? userData.profilePic.replace(/&amp;/g, '&') : ''
    const proxiedImageUrl = profilePicUrl 
      ? `/api/image-proxy?url=${encodeURIComponent(profilePicUrl)}&username=${username}`
      : `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff`
    
    return Response.json({
      username: userData.username,
      fullName: userData.fullName,
      profilePic: proxiedImageUrl,
      followers: userData.followers,
      following: userData.following,
      posts: userData.posts,
      biography: userData.biography,
      isPrivate: userData.isPrivate,
      isVerified: userData.isVerified
    })

  } catch (error) {
    console.error('❌ ERRO FATAL:', error.message)
    
    return Response.json({
      error: 'Não foi possível carregar o perfil: ' + error.message,
      username: username
    }, { status: 500 })
  }
}