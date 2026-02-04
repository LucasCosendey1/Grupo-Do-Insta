// lib/instagram-service.ts
import { processInstagramImageUrl } from '@/lib/image-utils'

export async function scrapeInstagramProfile(username: string) {
  console.log(`🤖 [SERVICE] Scraping (Modo Texto & JSON): ${username}`)
  
  let userData = await tryStrategy(username, 'desktop')
  
  if (!userData) {
    await new Promise(r => setTimeout(r, 1000))
    userData = await tryStrategy(username, 'android')
  }

  if (!userData) {
    console.log(`❌ Falha total para ${username}`)
    return null
  }

  const finalProfilePic = userData.profilePic && userData.profilePic.length > 5
    ? processInstagramImageUrl(userData.profilePic, username)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=200&background=00bfff&color=fff&bold=true`
  
  console.log(`✅ [SERVICE] Sucesso: ${userData.posts} posts, ${userData.following} seguindo`)
  
  return {
    ...userData,
    profilePic: finalProfilePic
  }
}

async function tryStrategy(username: string, type: 'android' | 'desktop') {
  try {
    const url = `https://www.instagram.com/${username}/`
    const headers = type === 'android' 
      ? { 'User-Agent': 'Instagram 219.0.0.12.117 Android (26/8.0.0; 480dpi; 1080x1920; samsung; SM-G935F; hero2lte; samsungexynos8890; en_US; 340967167)' }
      : { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }

    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000), cache: 'no-store' })
    if (!response.ok) return null
    const html = await response.text()
    
    if (html.includes('accounts/login') && !html.includes('"username"')) return null

    let data = {
        username, fullName: username, profilePic: '', 
        followers: 0, following: 0, posts: 0, 
        biography: '', isPrivate: false, isVerified: false
    }

    // 1️⃣ TENTATIVA: JSON COMPLETO (Melhor para BIO)
    const bioMatch = html.match(/"biography":"((?:[^"\\]|\\.)*)"/)
    if (bioMatch) {
         try { data.biography = JSON.parse(`"${bioMatch[1]}"`) } 
         catch { data.biography = bioMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') }
    }
    
    const fullNameMatch = html.match(/"full_name":"((?:[^"\\]|\\.)*)"/)
    if (fullNameMatch) {
         try { data.fullName = JSON.parse(`"${fullNameMatch[1]}"`) } catch {}
    }

    const picMatch = html.match(/"profile_pic_url_hd":"(.*?)"/) || html.match(/"profile_pic_url":"(.*?)"/)
    if (picMatch) data.profilePic = picMatch[1].replace(/\\u0026/g, '&')

    // 2️⃣ TENTATIVA: META DESCRIPTION (A mesma que pega seguidores!)
    // Exemplo de string: "911 Followers, 200 Following, 15 Posts - See Instagram photos..."
    const metaDesc = html.match(/<meta content="([^"]+)" name="description"/)
    if (metaDesc) {
        const text = metaDesc[1]
        
        // Regex para capturar números com K/M ou vírgulas
        const extractNumber = (label: string) => {
            const regex = new RegExp(`([\\d\\.,KM]+)\\s+${label}`, 'i')
            const match = text.match(regex)
            if (match) {
                let numStr = match[1].replace(/,/g, '')
                let multiplier = 1
                if (numStr.includes('K')) { multiplier = 1000; numStr = numStr.replace('K', '') }
                if (numStr.includes('M')) { multiplier = 1000000; numStr = numStr.replace('M', '') }
                return Math.floor(parseFloat(numStr) * multiplier)
            }
            return 0
        }

        // Puxa tudo da mesma string!
        data.followers = extractNumber('Followers')
        data.following = extractNumber('Following')
        data.posts = extractNumber('Posts')
    }

    // Fallback: Se o Meta falhou, tenta JSON para números
    if (data.followers === 0) {
        const fMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/); if(fMatch) data.followers = parseInt(fMatch[1])
        const flMatch = html.match(/"edge_follow":\{"count":(\d+)\}/); if(flMatch) data.following = parseInt(flMatch[1])
        const pMatch = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/); if(pMatch) data.posts = parseInt(pMatch[1])
    }
    
    // Fallback Imagem
    if (!data.profilePic) {
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
        if (imageMatch) data.profilePic = imageMatch[1]
    }

    if (data.followers > 0 || data.profilePic) return data
    return null
  } catch (e) {
    return null
  }
}