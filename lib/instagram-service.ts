// lib/instagram-service.ts
import { processInstagramImageUrl } from '@/lib/image-utils'

export async function scrapeInstagramProfile(username: string) {
  console.log(`🤖 [SERVICE] Iniciando scraping para: ${username}`)
  
  // Lista de Estratégias
  // 1. Mobile (Android)
  // 2. Mobile (iPhone)
  // 3. Desktop (Chrome)
  
  let userData = await tryStrategy(username, 'android')
  
  if (!userData) {
    console.log('⚠️ [SERVICE] Tentando estratégia iOS...')
    await new Promise(r => setTimeout(r, 1000)) // Pausa de 1s para respirar
    userData = await tryStrategy(username, 'ios')
  }

  if (!userData) {
    console.log('⚠️ [SERVICE] Tentando estratégia Desktop...')
    await new Promise(r => setTimeout(r, 1000))
    userData = await tryStrategy(username, 'desktop')
  }

  if (!userData) {
    console.log(`❌ [SERVICE] Todas as estratégias falharam para ${username}`)
    return null
  }

  const processedPic = processInstagramImageUrl(userData.profilePic, username)
  
  return {
    ...userData,
    profilePic: processedPic
  }
}

async function tryStrategy(username: string, type: 'android' | 'ios' | 'desktop') {
  try {
    const url = `https://www.instagram.com/${username}/`
    
    let headers = {}
    
    if (type === 'android') {
        headers = {
            'User-Agent': 'Instagram 219.0.0.12.117 Android (26/8.0.0; 480dpi; 1080x1920; samsung; SM-G935F; hero2lte; samsungexynos8890; en_US; 340967167)',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    } else if (type === 'ios') {
        headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 243.1.0.14.111',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    } else {
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Site': 'same-origin'
        }
    }

    const response = await fetch(url, {
      headers: headers,
      signal: AbortSignal.timeout(8000),
      // Adiciona cache: no-store para garantir que não pegue cache da Vercel
      cache: 'no-store'
    })

    if (!response.ok) return null

    const html = await response.text()
    
    // Se redirecionou para login, falhou
    if (html.includes('accounts/login') && !html.includes('"username"')) {
        return null
    }

    // --- EXTRAÇÃO DE DADOS ---
    let data = {
        username, fullName: username, profilePic: '', followers: 0,
        following: 0, posts: 0, biography: '', isPrivate: false, isVerified: false
    }

    // Regex Poderoso (Pega JSON embutido)
    const jsonMatch = html.match(/<script type="application\/json"[^>]*>({.*?})<\/script>/s) || 
                      html.match(/<script type="text\/javascript">window._sharedData = ({.*?});<\/script>/s)

    // Regex Fallback (Metadados)
    const metaDesc = html.match(/<meta content="([^"]+)" name="description"/)
    if (metaDesc) {
        // Ex: "100 Followers, 50 Following, 10 Posts..."
        const parts = metaDesc[1].split(', ')
        const followersPart = parts.find(p => p.includes('Followers'))
        if (followersPart) {
             // Limpa "10.5k" para número
             let num = followersPart.split(' ')[0]
             if (num.includes('M')) data.followers = parseFloat(num) * 1000000
             else if (num.includes('K')) data.followers = parseFloat(num) * 1000
             else data.followers = parseInt(num.replace(/,/g, ''))
        }
    }

    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
    if (imageMatch) data.profilePic = imageMatch[1]
    
    const titleMatch = html.match(/<title>(.*?) \(@/)
    if (titleMatch) data.fullName = titleMatch[1]

    if (data.profilePic && data.followers >= 0) {
        return data
    }

    return null
  } catch (e) {
    return null
  }
}