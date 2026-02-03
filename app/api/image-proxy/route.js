// app/api/image-proxy/route.js

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  const username = searchParams.get('username') || 'User'

  // Se não tiver URL, retorna Avatar Genérico
  if (!imageUrl || imageUrl.trim() === '') {
    return serveFallback(username)
  }

  try {
    // Tenta primeiro via Weserv (Proxy de Imagem Open Source)
    // Isso contorna o erro 403 do Instagram na maioria dos casos
    const wsrvUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=jpg&q=80&w=400`
    
    const response = await fetch(wsrvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      throw new Error(`Weserv falhou: ${response.status}`)
    }

    // Retorna a imagem processada
    return new Response(response.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
    
  } catch (error) {
    console.error(`⚠️ [PROXY ERROR]: ${username}`, error.message)
    
    // Se tudo falhar, fallback para o avatar de letras
    return serveFallback(username)
  }
}

// Função auxiliar para avatar de letras
async function serveFallback(username) {
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
  const res = await fetch(avatarUrl)
  return new Response(res.body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' }
  })
}