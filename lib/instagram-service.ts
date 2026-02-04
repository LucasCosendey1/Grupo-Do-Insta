// lib/instagram-service.ts
import { processInstagramImageUrl } from '@/lib/image-utils'

export async function scrapeInstagramProfile(username: string) {
  console.log(`🤖 [SERVICE] Scraping Híbrido (Texto + JSON): ${username}`)
  
  // Tenta desktop primeiro (geralmente tem o JSON mais completo)
  let userData = await tryStrategy(username, 'desktop')
  
  // Se falhar, espera um pouco e tenta mobile
  if (!userData) {
    await new Promise(r => setTimeout(r, 1500))
    userData = await tryStrategy(username, 'android')
  }

  // Se falhou tudo, cria um objeto "básico" para não quebrar a aplicação, 
  // mas com foto de avatar garantida pela lógica abaixo.
  if (!userData) {
    console.log(`❌ Falha total no scraping para ${username}. Gerando dados padrão.`)
    userData = {
        username, fullName: username, profilePic: '', 
        followers: 0, following: 0, posts: 0, 
        biography: '', isPrivate: false, isVerified: false
    }
  }

  // 🔥 REGRA DE OURO: Nunca retornar profilePic vazia
  let finalProfilePic = userData.profilePic

  // Se a foto vier vazia, curta demais ou inválida, usamos o Avatar
  if (!finalProfilePic || finalProfilePic.length < 5 || finalProfilePic === 'undefined') {
      console.log('⚠️ Foto não encontrada ou inválida. Gerando Avatar padrão.')
      finalProfilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
  } else {
      // Se tem foto, processa para evitar bloqueio de CORS e limpa caracteres unicode
      finalProfilePic = processInstagramImageUrl(finalProfilePic, username)
  }
  
  console.log(`✅ [SERVICE] Sucesso Final: ${userData.posts} posts, Foto: ${finalProfilePic.substring(0, 30)}...`)
  
  return {
    ...userData,
    profilePic: finalProfilePic
  }
}

async function tryStrategy(username: string, type: 'android' | 'desktop') {
  try {
    const url = `https://www.instagram.com/${username}/`
    
    // Headers específicos para enganar o Instagram
    const headers = type === 'android' 
      ? { 
          'User-Agent': 'Instagram 219.0.0.12.117 Android (26/8.0.0; 480dpi; 1080x1920; samsung; SM-G935F; hero2lte; samsungexynos8890; en_US; 340967167)',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      : { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }

    const response = await fetch(url, { 
        headers, 
        signal: AbortSignal.timeout(8000), // Timeout de 8s
        cache: 'no-store' 
    })

    if (!response.ok) return null
    const html = await response.text()
    
    // Se for redirecionado para login e não tiver dados, falhou
    if (html.includes('accounts/login') && !html.includes('"username"')) return null

    // Objeto base zerado
    let data = {
        username, fullName: username, profilePic: '', 
        followers: 0, following: 0, posts: 0, 
        biography: '', isPrivate: false, isVerified: false
    }

    // --- ESTRATÉGIA 1: Leitura de Texto (Meta Description) ---
    // Exemplo: "911 Followers, 200 Following, 15 Posts..."
    const metaDesc = html.match(/<meta content="([^"]+)" name="description"/)
    if (metaDesc) {
        const text = metaDesc[1]
        
        const extractNumber = (label: string) => {
            // Regex ajustado para pegar 1.5M, 1,200, 10K
            const regex = new RegExp(`([\\d\\.,KM]+)\\s+${label}`, 'i')
            const match = text.match(regex)
            
            if (match) {
                let numStr = match[1].replace(/,/g, '') // Remove vírgulas (ex: 1,200 -> 1200)
                let multiplier = 1
                
                // Trata K e M
                if (numStr.toUpperCase().includes('K')) { 
                    multiplier = 1000; 
                    numStr = numStr.replace(/K/i, '') 
                }
                if (numStr.toUpperCase().includes('M')) { 
                    multiplier = 1000000; 
                    numStr = numStr.replace(/M/i, '') 
                }
                
                // ParseFloat lida bem com pontos (1.5 -> 1.5)
                return Math.floor(parseFloat(numStr) * multiplier)
            }
            return 0
        }

        data.followers = extractNumber('Followers')
        data.following = extractNumber('Following')
        data.posts = extractNumber('Posts')
    }

    // --- ESTRATÉGIA 2: JSON Oculto (Melhor para Bio e Foto) ---
    
    // Bio
    const bioMatch = html.match(/"biography":"((?:[^"\\]|\\.)*)"/)
    if (bioMatch) {
         try { 
            data.biography = JSON.parse(`"${bioMatch[1]}"`) 
         } catch { 
            // Fallback manual: troca \n por quebra de linha real e \" por aspas
            data.biography = bioMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') 
         }
    }
    
    // Nome Completo
    const fullNameMatch = html.match(/"full_name":"((?:[^"\\]|\\.)*)"/)
    if (fullNameMatch) {
         try { data.fullName = JSON.parse(`"${fullNameMatch[1]}"`) } catch {}
    }

    // Foto de Perfil (Busca HD ou SD)
    const picMatch = html.match(/"profile_pic_url_hd":"(.*?)"/) || html.match(/"profile_pic_url":"(.*?)"/)
    if (picMatch) {
        // Importante: Instagram usa \u0026 no lugar de &
        data.profilePic = picMatch[1].replace(/\\u0026/g, '&')
    }

    // Verificado / Privado
    if (html.includes('"is_verified":true')) data.isVerified = true
    if (html.includes('"is_private":true')) data.isPrivate = true

    // Fallback de números pelo JSON (caso Meta Description falhe)
    if (data.followers === 0) {
        const fMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/); if(fMatch) data.followers = parseInt(fMatch[1])
        const flMatch = html.match(/"edge_follow":\{"count":(\d+)\}/); if(flMatch) data.following = parseInt(flMatch[1])
        const pMatch = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/); if(pMatch) data.posts = parseInt(pMatch[1])
    }
    
    // Fallback Imagem Meta Tag (og:image) - Último recurso para imagem
    if (!data.profilePic) {
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        if (imageMatch) {
            data.profilePic = imageMatch[1].replace(/\\u0026/g, '&').trim()
        }
    }

    // Critério de Sucesso: Precisa ter pelo menos seguidores OU foto
    if (data.followers > 0 || (data.profilePic && data.profilePic.length > 10)) {
        return data
    }
    
    return null
  } catch (e) {
    console.error(`Erro na estratégia ${type}:`, e)
    return null
  }
}