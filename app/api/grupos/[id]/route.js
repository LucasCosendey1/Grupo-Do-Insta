import { sql } from '@vercel/postgres'

// 🚨 COMANDOS ANTI-CACHE DO NEXT.JS (SERVER-SIDE)
// Isso obriga a rota a ser recriada a cada requisição, ignorando o cache estático do servidor.
export const dynamic = 'force-dynamic'
export const revalidate = 0

console.log('🔌 [API] POSTGRES_URL:', process.env.POSTGRES_URL?.substring(0, 50) + '...')

export async function GET(request, { params }) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [API] Nova requisição (SEM CACHE):', new Date().toISOString())
    const { id } = params

    if (!id) {
      return Response.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    // Buscar dados do grupo
    const grupoResult = await sql`
      SELECT * FROM grupos WHERE id = ${id}
    `

    if (grupoResult.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const grupo = grupoResult.rows[0]
    console.log('✅ [API] Grupo:', grupo.name)

    // Buscar TODOS os membros
    // Dica: Adicionei um timestamp inútil no final da query para garantir que o banco não cacheie a query exata
    const timestamp = Date.now() 
    console.log('📋 [API] Buscando todos os membros...')
    
    const membrosResult = await sql`SELECT 
      username,
      full_name,
      profile_pic,
      followers,
      following,
      posts,
      biography,
      is_private,
      is_verified,
      added_at
    FROM grupo_membros 
    WHERE grupo_id = ${id}
    -- O filtro abaixo não altera o resultado, mas força o Postgres a reavaliar a query
    AND ${timestamp} = ${timestamp} 
    ORDER BY added_at ASC
    `

    console.log('📊 [API] Membros encontrados:', membrosResult.rows.length)

    // Montar array de perfis
    const profiles = membrosResult.rows.map((m) => ({
      username: m.username,
      fullName: m.full_name || m.username,
      profilePic: m.profile_pic || `https://ui-avatars.com/api/?name=${m.username}&size=200&background=00bfff&color=fff`,
      followers: m.followers || 0,
      following: m.following || 0,
      posts: m.posts || 0,
      biography: m.biography || '',
      isPrivate: m.is_private || false,
      isVerified: m.is_verified || false
    }))

    const responseData = {
      success: true,
      group: {
        id: grupo.id,
        name: grupo.name,
        icon: {
          emoji: grupo.icon_emoji,
          name: grupo.icon_name
        },
        profiles: profiles,
        createdAt: grupo.created_at
      }
    }

    // ✅ HEADERS ANTI-CACHE (CLIENT-SIDE / BROWSER)
    // Isso avisa o navegador e a CDN da Vercel para não guardarem nada
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      }
    })

  } catch (error) {
    console.error('❌ [API] ERRO:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}