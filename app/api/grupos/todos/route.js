import { sql } from '@vercel/postgres'

// 🚨 OBRIGATÓRIO: Impede cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👑 [ADMIN] Buscando TODOS os grupos')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🔍 Timestamp: ${new Date().toISOString()}`)

    // Buscar TODOS os grupos do banco
    const result = await sql`
      SELECT 
        g.id,
        g.slug,
        g.name,
        g.icon_emoji,
        g.icon_name,
        g.creator_username,
        g.created_at,
        (SELECT COUNT(*) FROM grupo_membros WHERE grupo_id = g.slug OR grupo_id = g.id) as member_count
      FROM grupos g
      ORDER BY g.created_at DESC
    `

    console.log('✅ Grupos encontrados:', result.rows.length)

    const groups = result.rows.map(row => ({
      id: row.slug || row.id,
      slug: row.slug || row.id,
      name: row.name,
      icon: {
        emoji: row.icon_emoji,
        name: row.icon_name
      },
      creator: row.creator_username,
      memberCount: parseInt(row.member_count),
      createdAt: row.created_at
    }))

    console.log('📊 Total de grupos:', groups.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

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
    console.error('❌ Erro ao buscar todos os grupos:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}