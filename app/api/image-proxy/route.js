// ✅ PROXY DE IMAGENS CORRIGIDO
// Tenta buscar foto do Instagram, se falhar retorna avatar genérico DIRETO

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  const username = searchParams.get('username') || 'User'

  // ❌ Se não tem URL, retorna avatar genérico IMEDIATAMENTE
  if (!imageUrl || imageUrl.trim() === '') {
    console.log('⚠️ [IMAGE-PROXY] URL vazia para', username)
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
    
    try {
      const avatarResponse = await fetch(avatarUrl)
      const avatarBuffer = await avatarResponse.arrayBuffer()
      
      return new Response(avatarBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        }
      })
    } catch {
      return new Response('Image not found', { status: 404 })
    }
  }

  try {
    console.log('📸 [IMAGE-PROXY] Buscando:', imageUrl.substring(0, 50) + '...')
    
    // 🔥 CORREÇÃO 1: Decodificar &amp; antes de fazer fetch
    const cleanUrl = imageUrl.replace(/&amp;/g, '&')
    
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      // 🔥 CORREÇÃO 2: Timeout de 5 segundos
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const imageBuffer = await response.arrayBuffer()
    
    console.log('✅ [IMAGE-PROXY] Foto carregada!')

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
    
  } catch (error) {
    console.error('❌ [IMAGE-PROXY] Erro:', error.message)
    
    // 🔥 CORREÇÃO 3: Retornar avatar genérico (não redirecionar)
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
    
    try {
      const avatarResponse = await fetch(avatarUrl)
      const avatarBuffer = await avatarResponse.arrayBuffer()
      
      return new Response(avatarBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        }
      })
    } catch (avatarError) {
      // Se até o avatar falhar, retorna 404
      return new Response('Image not found', { status: 404 })
    }
  }
}