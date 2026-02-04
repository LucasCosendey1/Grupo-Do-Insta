// app/api/image-proxy/route.js

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')
    const username = searchParams.get('username') || 'User'

    if (!imageUrl || imageUrl.trim() === '') {
      console.log(`⚠️ [PROXY] URL vazia para @${username}`)
      return serveFallback(username)
    }

    console.log(`🔄 [PROXY] Carregando foto de @${username}`)

    // TENTATIVA 1: Weserv
    try {
      const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=jpg&q=80&w=400`
      
      const response = await fetch(wsrvUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)' },
        signal: AbortSignal.timeout(8000)
      })

      if (response.ok) {
        console.log(`✅ [PROXY] Sucesso via wsrv.nl`)
        return new Response(response.body, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    } catch (e) {
      console.warn(`⚠️ [PROXY] wsrv.nl falhou`)
    }

    // TENTATIVA 2: Images.weserv
    try {
      const imgUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&w=400&output=jpg`
      const response = await fetch(imgUrl, { signal: AbortSignal.timeout(8000) })

      if (response.ok) {
        console.log(`✅ [PROXY] Sucesso via images.weserv.nl`)
        return new Response(response.body, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' }
        })
      }
    } catch (e) {
      console.warn(`⚠️ [PROXY] images.weserv.nl falhou`)
    }

    // TENTATIVA 3: Fetch direto
    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.instagram.com/',
        },
        signal: AbortSignal.timeout(8000)
      })

      if (response.ok) {
        console.log(`✅ [PROXY] Sucesso via fetch direto`)
        return new Response(response.body, {
          headers: { 'Content-Type': response.headers.get('Content-Type') || 'image/jpeg' }
        })
      }
    } catch (e) {
      console.warn(`⚠️ [PROXY] Fetch direto falhou`)
    }

    console.error(`❌ [PROXY] Todas tentativas falharam`)
    return serveFallback(username)

  } catch (error) {
    console.error(`❌ [PROXY] ERRO FATAL:`, error.message)
    return serveFallback(new URL(request.url).searchParams.get('username') || 'User')
  }
}

async function serveFallback(username) {
  try {
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
    const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(5000) })
    
    if (res.ok) {
      return new Response(res.body, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' }
      })
    }
  } catch (e) {
    console.error(`❌ [PROXY] Fallback falhou`)
  }
  
  return new Response('Not found', { status: 404 })
}