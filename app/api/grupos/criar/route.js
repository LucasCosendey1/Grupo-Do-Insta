import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    if (!name || !creatorUsername) {
      return Response.json({ error: 'Nome e criador são obrigatórios' }, { status: 400 })
    }

    // Gerar ID único
    const groupId = `G-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // Criar grupo
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

    // Adicionar criador como primeiro membro
    await sql`
      INSERT INTO grupo_membros (grupo_id, username)
      VALUES (${groupId}, ${creatorUsername})
    `

    console.log('✅ Grupo criado:', groupId)

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