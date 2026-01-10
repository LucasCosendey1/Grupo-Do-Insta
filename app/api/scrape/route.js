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
    
    // 🔑 Foto de perfil com proxy
    const profilePicUrl = user.profile_pic_url_hd || user.profile_pic_url
    const proxiedImageUrl = profilePicUrl 
      ? `/api/image-proxy?url=${encodeURIComponent(profilePicUrl)}&username=${username}`
      : `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff`
    
    // 🔑 BUSCAR AS 3 POSTAGENS MAIS RECENTES
    const recentPosts = []
    if (user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.edges) {
      const posts = user.edge_owner_to_timeline_media.edges.slice(0, 3)
      
      posts.forEach(postEdge => {
        const post = postEdge.node
        let imageUrl = null
        
        // Pegar a URL da imagem/thumbnail
        if (post.display_url) {
          imageUrl = post.display_url
        } else if (post.thumbnail_src) {
          imageUrl = post.thumbnail_src
        }
        
        if (imageUrl) {
          recentPosts.push({
            id: post.id,
            shortcode: post.shortcode,
            imageUrl: `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`,
            likes: post.edge_liked_by?.count || 0,
            comments: post.edge_media_to_comment?.count || 0,
            isVideo: post.is_video || false,
            caption: post.edge_media_to_caption?.edges[0]?.node?.text || ''
          })
        }
      })
    }
    
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
      recentPosts: recentPosts, // 🔑 NOVO CAMPO
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
      recentPosts: [],
      error: 'Não foi possível obter dados completos.',
    })
  }
}