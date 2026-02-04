// lib/instagram-service.ts
import { processInstagramImageUrl } from '@/lib/image-utils'

export async function scrapeInstagramProfile(username: string) {
  console.log(`🤖 [SERVICE] Iniciando scraping TURBO para: ${username}`)
  
  // Tenta estratégias em ordem
  let userData = await tryStrategy(username, 'desktop') // Desktop costuma ter o JSON mais limpo hoje em dia
  
  if (!userData) {
    console.log('⚠️ [SERVICE] Tentando fallback mobile...')
    await new Promise(r => setTimeout(r, 1500)) 
    userData = await tryStrategy(username, 'android')
  }

  if (!userData) {
    console.log(`❌ [SERVICE] Todas as estratégias falharam para ${username}`)
    return null
  }

  // Garantir imagem válida
  const finalProfilePic = userData.profilePic && userData.profilePic.trim() !== ''
    ? processInstagramImageUrl(userData.profilePic, username)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
  
  console.log(`✅ [SERVICE] Sucesso para @${username}:`)
  console.log(`   - Seguidores: ${userData.followers}`)
  console.log(`   - Seguindo: ${userData.following}`)
  console.log(`   - Posts: ${userData.posts}`)
  console.log(`   - Bio: ${userData.biography ? 'Sim' : 'Não'}`)
  
  return {
    ...userData,
    profilePic: finalProfilePic
  }
}

async function tryStrategy(username: string, type: 'android' | 'desktop') {
  try {
    const url = `https://www.instagram.com/${username}/`
    let headers = {}
    
    if (type === 'android') {
        headers = {
            'User-Agent': 'Instagram 219.0.0.12.117 Android (26/8.0.0; 480dpi; 1080x1920; samsung; SM-G935F; hero2lte; samsungexynos8890; en_US; 340967167)',
            'Accept-Language': 'en-US,en;q=0.9',
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
      cache: 'no-store'
    })

    if (!response.ok) return null
    const html = await response.text()
    
    // Se redirecionou para login, falhou
    if (html.includes('accounts/login') && !html.includes('"username"')) return null

    // --- OBJETO INICIAL ---
    let data = {
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

    // 🕵️‍♂️ ESTRATÉGIA 1: Regex "Ninja" para pegar JSON oculto
    // O Instagram costuma colocar os dados dentro de xdt_api__v1__users__web_profile_info
    // Vamos procurar por padrões chave como "edge_followed_by" (seguidores) e "edge_follow" (seguindo)
    
    // Tenta pegar Seguidores
    const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/)
    if (followersMatch) data.followers = parseInt(followersMatch[1])

    // Tenta pegar Seguindo
    const followingMatch = html.match(/"edge_follow":\{"count":(\d+)\}/)
    if (followingMatch) data.following = parseInt(followingMatch[1])

    // Tenta pegar Posts (edge_owner_to_timeline_media)
    const postsMatch = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/)
    if (postsMatch) data.posts = parseInt(postsMatch[1])

    // Tenta pegar Nome Completo
    const fullNameMatch = html.match(/"full_name":"(.*?)"/)
    if (fullNameMatch) {
         // Limpa caracteres unicode escapados se houver
         try {
            data.fullName = JSON.parse(`"${fullNameMatch[1]}"`)
         } catch {
            data.fullName = fullNameMatch[1]
         }
    }

    // Tenta pegar Biografia
    const bioMatch = html.match(/"biography":"(.*?)"/)
    if (bioMatch) {
         try {
            data.biography = JSON.parse(`"${bioMatch[1]}"`)
         } catch {
            data.biography = bioMatch[1].replace(/\\n/g, '\n')
         }
    }

    // Tenta pegar Foto (HD se possível)
    const picMatch = html.match(/"profile_pic_url_hd":"(.*?)"/) || html.match(/"profile_pic_url":"(.*?)"/)
    if (picMatch) {
        // As URLs vêm com \u0026 em vez de &, precisamos corrigir
        data.profilePic = picMatch[1].replace(/\\u0026/g, '&')
    }

    // Tenta pegar status Verificado
    if (html.includes('"is_verified":true')) data.isVerified = true
    
    // Tenta pegar status Privado
    if (html.includes('"is_private":true')) data.isPrivate = true

    // --- ESTRATÉGIA 2: Fallback Meta Tags (Se o JSON falhar) ---
    // Se o regex JSON falhou (data.followers ainda é 0 e não achamos JSON), tenta o básico
    if (data.followers === 0) {
        const metaDesc = html.match(/<meta content="([^"]+)" name="description"/)
        if (metaDesc) {
            const parts = metaDesc[1].split(', ') // Ex: "100 Followers, 50 Following, 20 Posts..."
            
            // Followers
            const followersPart = parts.find(p => p.includes('Followers'))
            if (followersPart) {
                  let num = followersPart.split(' ')[0]
                  if (num.includes('M')) data.followers = parseFloat(num) * 1000000
                  else if (num.includes('K')) data.followers = parseFloat(num) * 1000
                  else data.followers = parseInt(num.replace(/,/g, ''))
            }
            
            // Following
            const followingPart = parts.find(p => p.includes('Following'))
            if (followingPart) {
                  let num = followingPart.split(' ')[0]
                  data.following = parseInt(num.replace(/,/g, '').replace('K', '000').replace('M', '000000'))
            }

            // Posts
            const postsPart = parts.find(p => p.includes('Posts'))
            if (postsPart) {
                  let num = postsPart.split(' ')[0]
                  data.posts = parseInt(num.replace(/,/g, '').replace('K', '000').replace('M', '000000'))
            }
        }

        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        if (imageMatch && !data.profilePic) {
            data.profilePic = imageMatch[1].trim()
        }
        
        const titleMatch = html.match(/<title>(.*?) \(@/)
        if (titleMatch && data.fullName === username) {
            data.fullName = titleMatch[1]
        }
    }

    // Se conseguiu pelo menos o básico, retorna
    if (data.followers > 0 || data.profilePic) {
        return data
    }

    return null
  } catch (e) {
    console.error('Erro no scrape:', e)
    return null
  }
}