// 🚀 VERSÃO 4 - SCRAPING CORRIGIDO
// Melhorias na extração de dados para funcionar com QUALQUER perfil público

/**
 * ESTRATÉGIA 1: API Web Profile (mais confiável)
 */
async function tryWebProfileAPI(username) {
  try {
    console.log('📱 [API-WEB] Tentando Web Profile API...')
    
    const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Instagram 312.0.0.37.103 Android (33/13; 480dpi; 1080x2270; samsung; SM-A536B; a53x; mt6833; pt_BR; 524700694)',
        'X-IG-App-ID': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'X-ASBD-ID': '129477',
        'X-IG-WWW-Claim': '0'
      }
    })
    
    console.log('📡 [API-WEB] Status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('📄 [API-WEB] Erro:', errorText.substring(0, 200))
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.data && data.data.user) {
      const user = data.data.user
      console.log('✅ [API-WEB] Dados obtidos!')
      console.log('   Username:', user.username)
      console.log('   Followers:', user.edge_followed_by?.count || 0)
      
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
 * ESTRATÉGIA 2: HTML Público (backup melhorado)
 */
async function tryPublicHTML(username) {
  try {
    console.log('🌐 [HTML] Tentando scraping de HTML público...')
    
    const url = `https://www.instagram.com/${username}/`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    console.log('📄 [HTML] Recebido, tamanho:', html.length)
    
    const data = extractFromHTML(html, username)
    
    if (data && data.followers >= 0) {
      console.log('✅ [HTML] Dados extraídos!')
      console.log('   Followers:', data.followers)
      console.log('   ProfilePic:', data.profilePic ? 'SIM' : 'NÃO')
      return data
    }
    
    throw new Error('Não encontrou dados no HTML')
    
  } catch (error) {
    console.log('❌ [HTML] Falhou:', error.message)
    return null
  }
}

/**
 * ESTRATÉGIA 3: Meta Tags (fallback básico)
 */
async function tryMetaTags(username) {
  try {
    console.log('🏷️ [META] Tentando extrair meta tags...')
    
    const url = `https://www.instagram.com/${username}/`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    // Extrair dados básicos das meta tags
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
    
    // OG:Image (foto de perfil)
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (imageMatch) data.profilePic = imageMatch[1]
    
    // OG:Title (pode conter nome)
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
    if (titleMatch) {
      const title = titleMatch[1]
      // Formato: "Nome (@username) • Instagram photos and videos"
      const nameMatch = title.match(/^(.+?)\s*\(@/)
      if (nameMatch) data.fullName = nameMatch[1].trim()
    }
    
    // OG:Description (pode conter bio e stats)
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/)
    if (descMatch) {
      const desc = descMatch[1]
      // Formato: "123 Followers, 456 Following, 789 Posts - See Instagram photos..."
      const followersMatch = desc.match(/(\d[\d,\.]*)\s*Followers/i)
      if (followersMatch) {
        data.followers = parseInt(followersMatch[1].replace(/[,\.]/g, ''), 10)
      }
      
      const followingMatch = desc.match(/(\d[\d,\.]*)\s*Following/i)
      if (followingMatch) {
        data.following = parseInt(followingMatch[1].replace(/[,\.]/g, ''), 10)
      }
      
      const postsMatch = desc.match(/(\d[\d,\.]*)\s*Posts/i)
      if (postsMatch) {
        data.posts = parseInt(postsMatch[1].replace(/[,\.]/g, ''), 10)
      }
    }
    
    console.log('✅ [META] Dados básicos extraídos')
    console.log('   ProfilePic:', data.profilePic ? 'SIM' : 'NÃO')
    console.log('   Followers:', data.followers)
    
    return data
    
  } catch (error) {
    console.log('❌ [META] Falhou:', error.message)
    return null
  }
}

/**
 * Extrai dados do HTML - VERSÃO MELHORADA
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
  
  console.log('🔍 [EXTRACT] Buscando dados no HTML...')
  
  // MÉTODO 1: Buscar JSON embutido (mais confiável)
  const jsonMatches = html.match(/<script type="application\/json"[^>]*>({.*?})<\/script>/gs)
  
  if (jsonMatches) {
    console.log(`📦 [EXTRACT] Encontrou ${jsonMatches.length} blocos JSON`)
    
    for (let i = 0; i < jsonMatches.length; i++) {
      try {
        const jsonStr = jsonMatches[i]
          .replace(/<script[^>]*>/, '')
          .replace(/<\/script>/, '')
        
        const json = JSON.parse(jsonStr)
        const user = findUserInJSON(json)
        
        if (user) {
          console.log(`✅ [EXTRACT] Usuário encontrado no bloco ${i + 1}`)
          
          data.fullName = user.full_name || user.fullName || username
          data.profilePic = user.profile_pic_url_hd || user.profile_pic_url || user.profilePicUrl || ''
          data.followers = user.edge_followed_by?.count || user.follower_count || user.followersCount || 0
          data.following = user.edge_follow?.count || user.following_count || user.followingCount || 0
          data.posts = user.edge_owner_to_timeline_media?.count || user.media_count || user.mediaCount || 0
          data.biography = user.biography || user.bio || ''
          data.isPrivate = user.is_private || user.isPrivate || false
          data.isVerified = user.is_verified || user.isVerified || false
          
          // Se encontrou followers válido, pode parar
          if (data.followers > 0) {
            console.log('✅ [EXTRACT] Dados completos encontrados!')
            break
          }
        }
      } catch (e) {
        // JSON inválido, continuar
        continue
      }
    }
  }
  
  // MÉTODO 2: Buscar via Regex no HTML bruto (fallback)
  if (data.followers === 0) {
    console.log('⚠️ [EXTRACT] JSON não funcionou, tentando regex...')
    
    // Padrões mais flexíveis
    const followersPatterns = [
      /"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
      /"follower_count"\s*:\s*(\d+)/,
      /"followersCount"\s*:\s*(\d+)/,
      /Followers","count":(\d+)/,
      /"followers"?\s*:\s*(\d+)/
    ]
    
    for (const pattern of followersPatterns) {
      const match = html.match(pattern)
      if (match) {
        data.followers = parseInt(match[1], 10)
        console.log('✅ [EXTRACT] Followers via regex:', data.followers)
        break
      }
    }
  }
  
  if (data.following === 0) {
    const patterns = [
      /"edge_follow"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
      /"following_count"\s*:\s*(\d+)/,
      /Following","count":(\d+)/
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        data.following = parseInt(match[1], 10)
        break
      }
    }
  }
  
  if (data.posts === 0) {
    const patterns = [
      /"edge_owner_to_timeline_media"\s*:\s*\{\s*"count"\s*:\s*(\d+)/,
      /"media_count"\s*:\s*(\d+)/,
      /Posts","count":(\d+)/
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match) {
        data.posts = parseInt(match[1], 10)
        break
      }
    }
  }
  
  // MÉTODO 3: Meta tags (último recurso)
  if (!data.profilePic) {
    const match = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (match) data.profilePic = match[1]
  }
  
  if (data.fullName === username) {
    const match = html.match(/<meta property="og:title" content="([^"]+)"/)
    if (match) {
      const title = match[1]
      const nameMatch = title.match(/^(.+?)\s*\(@/)
      if (nameMatch) data.fullName = nameMatch[1].trim()
    }
  }
  
  return data
}

/**
 * Busca recursiva no JSON - VERSÃO OTIMIZADA
 */
function findUserInJSON(obj, depth = 0, path = '') {
  if (depth > 15) return null
  
  if (!obj || typeof obj !== 'object') return null
  
  // Se tem username E algum indicador de ser dados de perfil
  if (obj.username && (
    obj.edge_followed_by || 
    obj.follower_count !== undefined || 
    obj.followersCount !== undefined ||
    obj.biography !== undefined ||
    obj.profile_pic_url
  )) {
    console.log(`🎯 [FIND] Usuário encontrado em: ${path || 'root'}`)
    return obj
  }
  
  // Caminhos comuns prioritários
  const priorityPaths = ['user', 'data.user', 'graphql.user', 'props.pageProps.user']
  for (const pPath of priorityPaths) {
    const parts = pPath.split('.')
    let current = obj
    for (const part of parts) {
      current = current?.[part]
    }
    if (current?.username) {
      const result = findUserInJSON(current, depth + 1, pPath)
      if (result) return result
    }
  }
  
  // Busca recursiva geral
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findUserInJSON(obj[key], depth + 1, path ? `${path}.${key}` : key)
      if (result) return result
    }
  }
  
  return null
}

/**
 * HANDLER PRINCIPAL
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🎯 NOVA REQUISIÇÃO DE SCRAPING')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 Username:', username)
  console.log('🕐 Timestamp:', new Date().toISOString())

  if (!username) {
    return Response.json({ error: 'Username não fornecido' }, { status: 400 })
  }

  try {
    let userData = null
    
    // ESTRATÉGIA 1: API Web Profile (mais confiável)
    userData = await tryWebProfileAPI(username)
    
    // ESTRATÉGIA 2: HTML Público (se API falhar)
    if (!userData || userData.followers === 0) {
      console.log('\n⚠️ Estratégia 1 falhou ou retornou 0 followers')
      console.log('🔄 Tentando estratégia 2...\n')
      userData = await tryPublicHTML(username)
    }
    
    // ESTRATÉGIA 3: Meta Tags (último recurso)
    if (!userData || userData.followers === 0) {
      console.log('\n⚠️ Estratégia 2 falhou')
      console.log('🔄 Tentando estratégia 3 (meta tags)...\n')
      userData = await tryMetaTags(username)
    }
    
    // Verificar se conseguiu algum dado
    if (!userData) {
      throw new Error('Todas as 3 estratégias falharam')
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ SUCESSO - Perfil encontrado!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 Username:', userData.username)
    console.log('📝 Nome:', userData.fullName)
    console.log('📊 Seguidores:', userData.followers)
    console.log('📊 Seguindo:', userData.following)
    console.log('📸 Posts:', userData.posts)
    console.log('🖼️  Foto:', userData.profilePic ? 'SIM' : 'NÃO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
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
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO FATAL NO SCRAPING')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    return Response.json({
      error: 'Perfil não encontrado ou Instagram bloqueou a requisição',
      username: username,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}