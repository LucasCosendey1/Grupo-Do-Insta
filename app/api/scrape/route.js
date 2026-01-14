// 📧 Credenciais do Instagram
const INSTAGRAM_CREDENTIALS = {
  username: 'alekcosendey',
  password: 'ruim123'
}

// Cache de sessão (cookies)
let sessionCache = {
  cookies: null,
  expiresAt: null
}

// Função para fazer login e obter cookies
async function loginInstagram() {
  try {
    console.log('🔐 Fazendo login no Instagram...')
    
    // 1. Primeiro, pegar o CSRF token da página inicial
    const homeResponse = await fetch('https://www.instagram.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
    
    const homeHtml = await homeResponse.text()
    const csrfMatch = homeHtml.match(/"csrf_token":"([^"]+)"/)
    const csrfToken = csrfMatch ? csrfMatch[1] : ''
    
    // Pegar cookies da página inicial
    const initialCookies = homeResponse.headers.get('set-cookie') || ''
    
    console.log('✅ CSRF Token obtido:', csrfToken.substring(0, 20) + '...')
    
    // 2. Fazer login
    const loginResponse = await fetch('https://www.instagram.com/api/v1/web/accounts/login/ajax/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'X-CSRFToken': csrfToken,
        'X-Instagram-AJAX': '1',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.instagram.com/',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initialCookies,
      },
      body: new URLSearchParams({
        username: INSTAGRAM_CREDENTIALS.username,
        enc_password: `#PWD_INSTAGRAM_BROWSER:0:${Date.now()}:${INSTAGRAM_CREDENTIALS.password}`,
        queryParams: '{}',
        optIntoOneTap: 'false'
      }).toString()
    })
    
    const loginData = await loginResponse.json()
    
    if (!loginData.authenticated) {
      throw new Error('Falha no login: ' + (loginData.message || 'Credenciais inválidas'))
    }
    
    // 3. Extrair cookies da resposta
    const setCookieHeaders = loginResponse.headers.get('set-cookie')
    const cookies = {}
    
    if (setCookieHeaders) {
      const cookieArray = setCookieHeaders.split(',')
      cookieArray.forEach(cookie => {
        const parts = cookie.split(';')[0].split('=')
        if (parts.length === 2) {
          cookies[parts[0].trim()] = parts[1].trim()
        }
      })
    }
    
    console.log('✅ Login realizado com sucesso!')
    
    // Cachear por 2 horas
    sessionCache = {
      cookies: cookies,
      expiresAt: Date.now() + (2 * 60 * 60 * 1000)
    }
    
    return cookies
    
  } catch (error) {
    console.error('❌ Erro no login:', error.message)
    throw error
  }
}

// Função para obter cookies válidos (usa cache ou faz novo login)
async function getValidCookies() {
  // Verificar se tem cache válido
  if (sessionCache.cookies && sessionCache.expiresAt > Date.now()) {
    console.log('✅ Usando sessão em cache')
    return sessionCache.cookies
  }
  
  // Fazer novo login
  return await loginInstagram()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  if (!username) {
    return Response.json(
      { error: 'Username não fornecido' },
      { status: 400 }
    )
  }

  try {
    // Obter cookies autenticados
    const cookies = await getValidCookies()
    
    // Construir string de cookies
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
    
    console.log('🔍 Buscando perfil:', username)
    
    // Buscar perfil com autenticação
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.instagram.com/',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookieString,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      }
    })

    if (!response.ok) {
      throw new Error('Erro ao buscar perfil')
    }

    const data = await response.json()
    
    if (!data.data || !data.data.user) {
      throw new Error('Perfil não encontrado')
    }

    const user = data.data.user
    
    console.log('✅ Perfil encontrado:', user.username)
    console.log('📊 Dados coletados:')
    console.log('  - Posts:', user.edge_owner_to_timeline_media?.count || 0)
    console.log('  - Seguidores:', user.edge_followed_by?.count || 0)
    console.log('  - Seguindo:', user.edge_follow?.count || 0)
    console.log('  - Bio:', user.biography || '(vazia)')
    
    // Foto de perfil com proxy
    const profilePicUrl = user.profile_pic_url_hd || user.profile_pic_url
    const proxiedImageUrl = profilePicUrl 
      ? `/api/image-proxy?url=${encodeURIComponent(profilePicUrl)}&username=${username}`
      : `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff`
    
    // RETORNAR APENAS OS DADOS ESSENCIAIS (SEM POSTAGENS RECENTES)
    return Response.json({
      username: user.username,
      fullName: user.full_name || user.username,
      profilePic: proxiedImageUrl,
      followers: user.edge_followed_by?.count || 0,
      following: user.edge_follow?.count || 0,
      posts: user.edge_owner_to_timeline_media?.count || 0,
      biography: user.biography || '',
      isPrivate: user.is_private || false,
      isVerified: user.is_verified || false,
    })

  } catch (error) {
    console.error('❌ API Error:', error.message)
    
    return Response.json(
      { 
        error: 'Não foi possível carregar o perfil: ' + error.message,
        username: username 
      },
      { status: 500 }
    )
  }
}