import { sql } from '@vercel/postgres'

// 🚨 OBRIGATÓRIO: Impede que o Vercel faça cache estático dessa rota
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return Response.json({ error: 'Username não fornecido' }, { status: 400 })
    }

    // Timestamp para logar que a requisição é fresca
    console.log(`🔍 [${new Date().toISOString()}] Buscando grupos frescos para:`, username)

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
      slug: row.slug || row.id,
      name: row.name,
      icon: {
        emoji: row.icon_emoji,
        name: row.icon_name
      },
      creator: row.creator_username,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at,
      // 💡 ADICIONAL: Injetamos o membro atual para compatibilidade com filtros do frontend
      members: [{ username: username }]
    }))

    // Retornamos com headers que PROÍBEM cache no navegador e na CDN
    return new Response(JSON.stringify({ success: true, groups }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })

  } catch (error) {
    console.error('❌ Erro ao buscar grupos:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}