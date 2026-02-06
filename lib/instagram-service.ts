// lib/instagram-service.ts
import { processInstagramImageUrl } from '@/lib/image-utils'

export async function scrapeInstagramProfile(username: string) {
  console.log(`📱 [SERVICE] Iniciando Scraping Mobile para: @${username}`)
  
  // Tenta direto a estratégia mobile (Chrome Android)
  let userData = await tryMobileStrategy(username)

  // Se falhou (null), cria o objeto padrão vazio
  if (!userData) {
    console.log(`❌ Falha no scraping para ${username}. Gerando dados placeholder.`)
    userData = {
        username, fullName: username, profilePic: '', 
        followers: 0, following: 0, posts: 0, 
        biography: '', isPrivate: false, isVerified: false
    }
  }

  // --- LÓGICA DE FOTO E AVATAR ---
  let finalProfilePic = userData.profilePic

  // Validação mais robusta para url de foto quebrada ou vazia
  const isInvalidPic = !finalProfilePic || finalProfilePic.length < 10 || finalProfilePic.includes('null') || finalProfilePic === 'undefined';

  if (isInvalidPic) {
      console.log('⚠️ Foto não encontrada/inválida. Gerando Avatar UI-Avatars.')
      finalProfilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
  } else {
      // Limpa a URL para tentar evitar erros de assinatura do Instagram
      finalProfilePic = processInstagramImageUrl(finalProfilePic, username)
  }
  
  console.log(`✅ [SERVICE] Resultado: ${userData.followers} seguidores, Foto: ${isInvalidPic ? 'Avatar' : 'Original'}`)
  
  return {
    ...userData,
    profilePic: finalProfilePic
  }
}

async function tryMobileStrategy(username: string) {
  let controller = new AbortController();
  let id = setTimeout(() => controller.abort(), 8000); // 8 segundos de limite forçado

  try {
    const url = `https://www.instagram.com/${username}/`
    
    const headers = { 
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'no-cache'
    }

    const response = await fetch(url, { 
        headers, 
        signal: controller.signal, // Usando o controller manual
        cache: 'no-store' 
    }).finally(() => clearTimeout(id)); // Limpa o timer assim que terminar

    if (!response.ok) {
        console.warn(`⚠️ HTTP Error: ${response.status}`)
        return null
    }

    const html = await response.text()
    
    // Verificações de segurança
    if (!html || html.length < 500 || html.includes('Login • Instagram')) {
        return null
    }

    let data = {
        username, fullName: username, profilePic: '', 
        followers: 0, following: 0, posts: 0, 
        biography: '', isPrivate: false, isVerified: false
    }

    // --- EXTRAÇÃO (Mantive a lógica Regex corrigida) ---
    const metaDescRegex = /<meta[^>]*content="([^"]*)"[^>]*name="description"|<meta[^>]*name="description"[^>]*content="([^"]*)"/i
    const metaDescMatch = html.match(metaDescRegex)
    const text = metaDescMatch ? (metaDescMatch[1] || metaDescMatch[2]) : null

    if (text) {
        const extractNumber = (label: string) => {
            const regex = new RegExp(`([\\d\\.,KM]+)\\s+${label}`, 'i')
            const match = text.match(regex)
            if (match) {
                let numStr = match[1].replace(/,/g, '')
                let multiplier = 1
                if (numStr.toUpperCase().includes('K')) { multiplier = 1000; numStr = numStr.replace(/K/i, '') }
                if (numStr.toUpperCase().includes('M')) { multiplier = 1000000; numStr = numStr.replace(/M/i, '') }
                return Math.floor(parseFloat(numStr) * multiplier)
            }
            return 0
        }
        data.followers = extractNumber('Followers')
        data.following = extractNumber('Following')
        data.posts = extractNumber('Posts')
    }

    const imageRegex = /<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i
    const imageMatch = html.match(imageRegex)
    if (imageMatch && imageMatch[1]) {
        data.profilePic = imageMatch[1].replace(/\\u0026/g, '&').trim()
    }

    const titleRegex = /<title>([^•(]+)\s*\(@/i
    const titleMatch = html.match(titleRegex)
    if (titleMatch && titleMatch[1]) {
        data.fullName = titleMatch[1].trim()
    }

    if (data.followers > 0 || (data.profilePic && data.profilePic.length > 20)) {
        return data
    }
    
    return null

  } catch (e) {
    // Se der erro, garante que o timer é limpo
    clearTimeout(id)
    console.error(`❌ Erro no fetch:`, e)
    return null
  }
}