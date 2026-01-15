import { sql } from '@vercel/postgres'

export async function GET(request, { params }) {
  try {
    const { id } = params

    // Buscar dados do grupo
    const grupoResult = await sql`
      SELECT * FROM grupos WHERE id = ${id}
    `

    if (grupoResult.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const grupo = grupoResult.rows[0]

    // Buscar lista de usernames
    const membrosResult = await sql`
      SELECT username, added_at 
      FROM grupo_membros 
      WHERE grupo_id = ${id}
      ORDER BY added_at ASC
    `

    const usernames = membrosResult.rows.map(m => m.username)

    console.log('✅ Grupo:', id, '- Membros:', usernames)

    return Response.json({
      success: true,
      group: {
        id: grupo.id,
        name: grupo.name,
        icon: {
          emoji: grupo.icon_emoji,
          name: grupo.icon_name
        },
        creator: grupo.creator_username,
        usernames: usernames, // ['maria', 'joao', 'pedro']
        createdAt: grupo.created_at
      }
    })

  } catch (error) {
    console.error('❌ Erro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}