import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    // Agora recebemos o objeto 'creatorData' enviado pelo Frontend
    const { name, icon, creatorUsername, creatorData } = await request.json()

    if (!name || !creatorUsername) {
      return Response.json({ error: 'Nome e criador são obrigatórios' }, { status: 400 })
    }

    console.log('🚀 Criando grupo:', name, 'por', creatorUsername)

    // Gerar ID único no padrão G-timestamp
    const groupId = `G-${Date.now()}`

    // 1. Criar o grupo no banco
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

    console.log('✅ Grupo criado no banco:', groupId)

    // 2. Adicionar criador como membro usando os dados que o Frontend "lembrou" do LocalStorage
    await sql`
      INSERT INTO grupo_membros (
        grupo_id, 
        username,
        full_name,
        profile_pic,
        followers,
        following,
        posts,
        biography,
        is_private,
        is_verified
      )
      VALUES (
        ${groupId},
        ${creatorUsername},
        ${creatorData?.fullName || creatorUsername},
        ${creatorData?.profilePic || ''},
        ${creatorData?.followers || 0},
        ${creatorData?.following || 0},
        ${creatorData?.posts || 0},
        ${creatorData?.biography || ''},
        ${creatorData?.isPrivate || false},
        ${creatorData?.isVerified || false}
      )
    `

    console.log('✅ Criador adicionado com dados reais enviados pelo cliente')

    return Response.json({
      success: true,
      groupId: groupId,
      name: name
    })

  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}