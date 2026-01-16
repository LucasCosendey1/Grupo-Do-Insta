import { sql } from '@vercel/postgres'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return Response.json({ error: 'Username não fornecido' }, { status: 400 })
    }

    console.log('🔍 Buscando grupos do usuário:', username)

    // Buscar todos os grupos onde o usuário é membro
    const result = await sql`
      SELECT 
        g.id,
        g.name,
        g.icon_emoji,
        g.icon_name,
        g.creator_username,
        g.created_at,
        (SELECT COUNT(*) FROM grupo_membros WHERE grupo_id = g.id) as member_count
      FROM grupos g
      INNER JOIN grupo_membros gm ON g.id = gm.grupo_id
      WHERE LOWER(gm.username) = LOWER(${username})
      ORDER BY g.created_at DESC
    `

    console.log('✅ Grupos encontrados:', result.rows.length)

    const groups = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      icon: {
        emoji: row.icon_emoji,
        name: row.icon_name
      },
      creator: row.creator_username,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }))

    return Response.json({
      success: true,
      groups: groups
    })

  } catch (error) {
    console.error('❌ Erro ao buscar grupos:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}