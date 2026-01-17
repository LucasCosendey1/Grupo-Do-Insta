import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    // ✅ CORREÇÃO: Recebendo 'creatorData' (perfil completo) do Frontend
    const { name, icon, creatorUsername, creatorData: clientCreatorData } = await request.json()

    if (!name || !creatorUsername) {
      return Response.json({ error: 'Nome e criador são obrigatórios' }, { status: 400 })
    }

    console.log('🚀 Criando grupo:', name, 'por', creatorUsername)

    // Gerar ID único
    const groupId = `G-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // --- LÓGICA DE DADOS DO CRIADOR ---
    let dadosFinais = null

    // 1. TENTATIVA RÁPIDA (Prioridade): Usar dados enviados pelo Frontend
    if (clientCreatorData && clientCreatorData.profilePic) {
      console.log('⚡ Usando dados enviados pelo frontend (Sem Scrape - Foto Garantida)')
      dadosFinais = {
        username: creatorUsername,
        fullName: clientCreatorData.fullName || creatorUsername,
        profilePic: clientCreatorData.profilePic, // A foto certa vem daqui!
        followers: clientCreatorData.followers || 0,
        following: clientCreatorData.following || 0,
        posts: clientCreatorData.posts || 0,
        biography: clientCreatorData.biography || '',
        isPrivate: clientCreatorData.isPrivate || false,
        isVerified: clientCreatorData.isVerified || false
      }
    } 
    // 2. TENTATIVA LENTA (Backup): Fazer scrape interno (costuma falhar no Vercel)
    else {
      console.log('⚠️ Dados não vieram do front. Tentando scrape interno (risco de avatar genérico)...')
      
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
      const scrapeUrl = `${protocol}://${host}/api/scrape?username=${encodeURIComponent(creatorUsername)}`
      
      let scrapedData = null
      try {
        const scrapeResponse = await fetch(scrapeUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        if (scrapeResponse.ok) scrapedData = await scrapeResponse.json()
      } catch (e) {
        console.warn('⚠️ Falha no scrape interno:', e.message)
      }

      // Fallback Genérico
      dadosFinais = {
        username: creatorUsername,
        fullName: scrapedData?.fullName || creatorUsername,
        profilePic: scrapedData?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorUsername)}&size=200&background=00bfff&color=fff`,
        followers: scrapedData?.followers || 0,
        isVerified: scrapedData?.isVerified || false,
        isPrivate: false,
        following: 0,
        posts: 0,
        biography: ''
      }
    }

    console.log('💾 Salvando grupo no banco...')

    // Inserir Grupo
    await sql`
      INSERT INTO grupos (id, name, icon_emoji, icon_name, creator_username)
      VALUES (
        ${groupId},
        ${name},
        ${icon?.emoji || '⚡'},
        ${icon?.name || 'Raio'},
        ${creatorUsername}
      )
    `

    // Inserir Criador como Membro
    await sql`
      INSERT INTO grupo_membros (
        grupo_id, username, full_name, profile_pic, followers, 
        following, posts, biography, is_private, is_verified
      )
      VALUES (
        ${groupId},
        ${dadosFinais.username},
        ${dadosFinais.fullName},
        ${dadosFinais.profilePic},
        ${dadosFinais.followers},
        ${dadosFinais.following},
        ${dadosFinais.posts},
        ${dadosFinais.biography},
        ${dadosFinais.isPrivate},
        ${dadosFinais.isVerified}
      )
    `

    console.log('✅ Grupo criado com sucesso!')

    return Response.json({
      success: true,
      groupId: groupId,
      name: name,
      creatorData: dadosFinais
    })

  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}