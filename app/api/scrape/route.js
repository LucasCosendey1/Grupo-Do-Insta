// 📁 ARQUIVO: app/api/scrape/route.js
// ⚠️ SUBSTITUIR O ARQUIVO EXISTENTE POR ESTE

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
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-IG-App-ID': '936619743392459',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      }
    })

    if (!response.ok) {
      throw new Error('Erro ao acessar API do Instagram')
    }

    const data = await response.json()
    
    if (!data.data || !data.data.user) {
      throw new Error('Perfil não encontrado')
    }

    const user = data.data.user
    
    // 🔑 MUDANÇA PRINCIPAL: Usar proxy para a imagem
    const profilePicUrl = user.profile_pic_url_hd || user.profile_pic_url
    const proxiedImageUrl = profilePicUrl 
      ? `/api/image-proxy?url=${encodeURIComponent(profilePicUrl)}&username=${username}`
      : `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff`
    
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
    console.error('API Error:', error.message)
    
    // Fallback com avatar gerado
    return Response.json({
      username: username,
      fullName: username,
      profilePic: `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff`,
      followers: 0,
      following: 0,
      posts: 0,
      biography: '',
      isPrivate: false,
      error: 'Não foi possível obter dados completos.',
    })
  }
}