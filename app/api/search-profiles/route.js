// API para buscar perfis do Instagram (simulação por enquanto)
// Na versão de produção, integrar com a API real do Instagram

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
    // Por enquanto, vamos simular com alguns perfis de exemplo
    // Na produção, isso buscaria na API real do Instagram
    const mockProfiles = [
      {
        username: query,
        fullName: `${query.charAt(0).toUpperCase() + query.slice(1)} Silva`,
        profilePic: `https://ui-avatars.com/api/?name=${query}&size=200&background=00bfff&color=fff`,
        followers: Math.floor(Math.random() * 10000) + 500,
        isVerified: false
      },
      {
        username: `${query}_oficial`,
        fullName: `${query.charAt(0).toUpperCase() + query.slice(1)} Oficial`,
        profilePic: `https://ui-avatars.com/api/?name=${query}_oficial&size=200&background=ff6b6b&color=fff`,
        followers: Math.floor(Math.random() * 50000) + 10000,
        isVerified: true
      },
      {
        username: `${query}123`,
        fullName: `${query} Real`,
        profilePic: `https://ui-avatars.com/api/?name=${query}123&size=200&background=4ecdc4&color=fff`,
        followers: Math.floor(Math.random() * 5000) + 100,
        isVerified: false
      }
    ]

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 300))

    return Response.json({
      profiles: mockProfiles,
      query: query
    })

  } catch (error) {
    console.error('Erro na busca:', error)
    return Response.json(
      { error: 'Erro ao buscar perfis', profiles: [] },
      { status: 500 }
    )
  }
}