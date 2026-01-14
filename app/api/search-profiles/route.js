// API para buscar perfis do Instagram
// Agora integrada com a API scrape para buscar dados reais

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query || query.length < 2) {
    return Response.json(
      { error: 'Query muito curta', profiles: [] },
      { status: 400 }
    )
  }

  try {
    console.log('🔍 Buscando perfil:', query)
    
    // Fazer requisição para a API scrape interna
    const cleanUsername = query.replace('@', '').trim().toLowerCase()
    
    // Construir URL absoluta para a API scrape
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const scrapeUrl = `${protocol}://${host}/api/scrape?username=${encodeURIComponent(cleanUsername)}`
    
    console.log('📡 Chamando scrape API:', scrapeUrl)
    
    const scrapeResponse = await fetch(scrapeUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0'
      }
    })

    if (scrapeResponse.ok) {
      const profileData = await scrapeResponse.json()
      
      // Verificar se há erro na resposta
      if (profileData.error) {
        console.log('❌ Erro do scrape:', profileData.error)
        return Response.json({
          profiles: [],
          query: query,
          error: profileData.error
        })
      }
      
      console.log('✅ Perfil encontrado:', profileData.username)
      console.log('📊 Dados completos:')
      console.log('  - Posts:', profileData.posts)
      console.log('  - Seguidores:', profileData.followers)
      console.log('  - Seguindo:', profileData.following)
      console.log('  - Bio:', profileData.biography ? 'Sim' : 'Não')
      
      // Retornar como array de perfis
      return Response.json({
        profiles: [{
          username: profileData.username,
          fullName: profileData.fullName,
          profilePic: profileData.profilePic,
          followers: profileData.followers,
          following: profileData.following,
          posts: profileData.posts,
          biography: profileData.biography,
          isVerified: profileData.isVerified,
          isPrivate: profileData.isPrivate,
          recentPosts: profileData.recentPosts || []
        }],
        query: query
      })
    } else {
      console.log('❌ Falha ao buscar perfil')
      
      // Se falhar, retornar erro amigável
      return Response.json({
        profiles: [],
        query: query,
        error: 'Perfil não encontrado ou erro ao acessar Instagram'
      })
    }

  } catch (error) {
    console.error('❌ Erro na busca:', error)
    return Response.json(
      { 
        error: 'Erro ao buscar perfis: ' + error.message, 
        profiles: [],
        query: query
      },
      { status: 500 }
    )
  }
}