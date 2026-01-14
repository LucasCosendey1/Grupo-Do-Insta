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
    console.log('🔐 [LOGIN] Iniciando login no Instagram...')
    console.log('👤 [LOGIN] Username:', INSTAGRAM_CREDENTIALS.username)
    
    // 1. Primeiro, pegar o CSRF token da página inicial
    console.log('📄 [LOGIN] Buscando página inicial do Instagram...')
    const homeResponse = await fetch('https://www.instagram.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    })
    
    console.log('📡 [LOGIN] Status da página inicial:', homeResponse.status)
    
    if (!homeResponse.ok) {
      throw new Error(`Falha ao acessar Instagram: ${homeResponse.status}`)
    }
    
    const homeHtml = await homeResponse.text()
    console.log('📝 [LOGIN] HTML recebido, tamanho:', homeHtml.length, 'caracteres')
    
    const csrfMatch = homeHtml.match(/"csrf_token":"([^"]+)"/)
    const csrfToken = csrfMatch ? csrfMatch[1] : ''
    
    if (!csrfToken) {
      console.error('❌ [LOGIN] CSRF token não encontrado no HTML')
      throw new Error('CSRF token não encontrado')
    }
    
    // Pegar cookies da página inicial
    const initialCookies = homeResponse.headers.get('set-cookie') || ''
    
    console.log('✅ [LOGIN] CSRF Token obtido:', csrfToken.substring(0, 20) + '...')
    console.log('🍪 [LOGIN] Cookies iniciais recebidos:', initialCookies ? 'Sim' : 'Não')
    
    // 2. Fazer login
    console.log('🔑 [LOGIN] Enviando credenciais...')
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
    
    console.log('📡 [LOGIN] Status do login:', loginResponse.status)
    
    const loginData = await loginResponse.json()
    console.log('📦 [LOGIN] Resposta do login:', JSON.stringify(loginData, null, 2))
    
    if (!loginData.authenticated) {
      console.error('❌ [LOGIN] Autenticação falhou:', loginData.message || 'Credenciais inválidas')
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
    
    console.log('🍪 [LOGIN] Cookies extraídos:', Object.keys(cookies).length)
    console.log('✅ [LOGIN] Login realizado com sucesso!')
    
    // Cachear por 2 horas
    sessionCache = {
      cookies: cookies,
      expiresAt: Date.now() + (2 * 60 * 60 * 1000)
    }
    
    return cookies
    
  } catch (error) {
    console.error('❌ [LOGIN] Erro no login:', error.message)
    console.error('🔍 [LOGIN] Stack trace:', error.stack)
    throw error
  }
}

// Função para obter cookies válidos (usa cache ou faz novo login)
async function getValidCookies() {
  // Verificar se tem cache válido
  if (sessionCache.cookies && sessionCache.expiresAt > Date.now()) {
    console.log('✅ [CACHE] Usando sessão em cache')
    console.log('⏰ [CACHE] Expira em:', new Date(sessionCache.expiresAt).toLocaleString('pt-BR'))
    return sessionCache.cookies
  }
  
  console.log('🔄 [CACHE] Cache expirado ou inexistente, fazendo novo login...')
  // Fazer novo login
  return await loginInstagram()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')

  console.log('\n=== NOVA REQUISIÇÃO ===')
  console.log('🎯 [API] Username solicitado:', username)
  console.log('🌍 [API] Ambiente:', process.env.VERCEL ? 'Vercel' : 'Local')
  console.log('⏰ [API] Timestamp:', new Date().toLocaleString('pt-BR'))

  if (!username) {
    console.error('❌ [API] Username não fornecido')
    return Response.json(
      { error: 'Username não fornecido' },
      { status: 400 }
    )
  }

  try {
    console.log('🔑 [API] Obtendo cookies de autenticação...')
    // Obter cookies autenticados
    const cookies = await getValidCookies()
    
    // Construir string de cookies
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
    
    console.log('🍪 [API] Cookies preparados, tamanho:', cookieString.length, 'caracteres')
    console.log('🔍 [API] Buscando perfil:', username)
    
    // Buscar perfil com autenticação
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    console.log('🌐 [API] URL:', url)
    
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

    console.log('📡 [API] Status da resposta:', response.status)
    console.log('📋 [API] Headers da resposta:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))

    if (!response.ok) {
      console.error('❌ [API] Erro ao buscar perfil, status:', response.status)
      const errorText = await response.text()
      console.error('📄 [API] Resposta de erro:', errorText.substring(0, 500))
      throw new Error(`Erro ao buscar perfil: ${response.status}`)
    }

    const data = await response.json()
    console.log('📦 [API] Dados recebidos:', JSON.stringify(data).substring(0, 200) + '...')
    
    if (!data.data || !data.data.user) {
      console.error('❌ [API] Estrutura de dados inválida')
      console.error('📄 [API] Dados completos:', JSON.stringify(data))
      throw new Error('Perfil não encontrado')
    }

    const user = data.data.user
    
    console.log('✅ [API] Perfil encontrado:', user.username)
    console.log('📊 [API] Dados coletados:')
    console.log('  - Posts:', user.edge_owner_to_timeline_media?.count || 0)
    console.log('  - Seguidores:', user.edge_followed_by?.count || 0)
    console.log('  - Seguindo:', user.edge_follow?.count || 0)
    console.log('  - Bio:', user.biography || '(vazia)')
    
    // Foto de perfil com proxy
    const profilePicUrl = user.profile_pic_url_hd || user.profile_pic_url
    const proxiedImageUrl = profilePicUrl 
      ? `/api/image-proxy?url=${encodeURIComponent(profilePicUrl)}&username=${username}`
      : `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff`
    
    const result = {
      username: user.username,
      fullName: user.full_name || user.username,
      profilePic: proxiedImageUrl,
      followers: user.edge_followed_by?.count || 0,
      following: user.edge_follow?.count || 0,
      posts: user.edge_owner_to_timeline_media?.count || 0,
      biography: user.biography || '',
      isPrivate: user.is_private || false,
      isVerified: user.is_verified || false,
    }
    
    console.log('✅ [API] Retornando dados do perfil')
    console.log('=== FIM DA REQUISIÇÃO ===\n')
    
    return Response.json(result)

  } catch (error) {
    console.error('❌ [API] ERRO FATAL:', error.message)
    console.error('🔍 [API] Stack trace:', error.stack)
    console.log('=== FIM DA REQUISIÇÃO (COM ERRO) ===\n')
    
    return Response.json(
      { 
        error: 'Não foi possível carregar o perfil: ' + error.message,
        username: username,
        debug: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    )
  }
}