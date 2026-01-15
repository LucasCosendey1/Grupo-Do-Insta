import { sql } from '@vercel/postgres'

export async function GET(request, { params }) {
  try {
    console.log('🔍 [API] Buscando grupo...')
    const { id } = params

    if (!id) {
      console.log('❌ [API] ID não fornecido')
      return Response.json({ error: 'ID não fornecido' }, { status: 400 })
    }

    console.log('🔎 [API] ID do grupo:', id)

    // Buscar dados do grupo
    const grupoResult = await sql`
      SELECT * FROM grupos WHERE id = ${id}
    `

    if (grupoResult.rows.length === 0) {
      console.log('❌ [API] Grupo não encontrado no banco')
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const grupo = grupoResult.rows[0]
    console.log('✅ [API] Grupo encontrado:', grupo.name)

    // Buscar membros com TODOS os dados
    const membrosResult = await sql`
      SELECT 
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
      ORDER BY added_at ASC
    `

    console.log('👥 [API] Total de membros no banco:', membrosResult.rows.length)
    console.log('📋 [API] Usernames:', membrosResult.rows.map(m => m.username).join(', '))

    // Montar array de perfis completos
    const profiles = membrosResult.rows.map(m => ({
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

    console.log('✅ [API] Retornando', profiles.length, 'perfis completos')

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
        profiles: profiles, // ← IMPORTANTE: Array de perfis completos
        createdAt: grupo.created_at
      }
    })

  } catch (error) {
    console.error('❌ [API] Erro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}