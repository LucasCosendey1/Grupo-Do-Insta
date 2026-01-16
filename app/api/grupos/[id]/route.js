import { sql } from '@vercel/postgres'

console.log('🔌 [API] POSTGRES_URL:', process.env.POSTGRES_URL?.substring(0, 50) + '...')

export async function GET(request, { params }) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
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
    console.log('👑 [API] Criador:', grupo.creator_username)

    // Buscar membros com TODOS os dados
    console.log('📋 [API] Executando query de membros...')
    
    const membrosResult = await query`SELECT 
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

    console.log('📊 [API] Rows retornadas do banco:', membrosResult.rows.length)
    console.log('👥 [API] Usernames no banco:', membrosResult.rows.map(m => m.username).join(', '))

    // Debug: mostrar CADA membro
    membrosResult.rows.forEach((m, index) => {
      console.log(`   ${index + 1}. @${m.username}:`)
      console.log(`      - full_name: ${m.full_name || 'NULL'}`)
      console.log(`      - profile_pic: ${m.profile_pic ? 'HAS DATA' : 'NULL'}`)
      console.log(`      - followers: ${m.followers}`)
    })

    // Montar array de perfis completos
    console.log('🔨 [API] Montando array de perfis...')
    
    const profiles = membrosResult.rows.map((m, index) => {
      console.log(`   Processando membro ${index + 1}/@${m.username}...`)
      
      const profile = {
        username: m.username,
        fullName: m.full_name || m.username,
        profilePic: m.profile_pic || `https://ui-avatars.com/api/?name=${m.username}&size=200&background=00bfff&color=fff`,
        followers: m.followers || 0,
        following: m.following || 0,
        posts: m.posts || 0,
        biography: m.biography || '',
        isPrivate: m.is_private || false,
        isVerified: m.is_verified || false
      }
      
      console.log(`   ✅ Profile criado para @${profile.username}`)
      return profile
    })

    console.log('📦 [API] Array de profiles montado. Total:', profiles.length)
    console.log('📋 [API] Usernames no array:', profiles.map(p => p.username).join(', '))

    const response = {
      success: true,
      group: {
        id: grupo.id,
        name: grupo.name,
        icon: {
          emoji: grupo.icon_emoji,
          name: grupo.icon_name
        },
        creator: grupo.creator_username,
        profiles: profiles,
        createdAt: grupo.created_at
      }
    }

    console.log('📤 [API] Retornando response com', response.group.profiles.length, 'perfis')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return Response.json(response)

  } catch (error) {
    console.error('❌ [API] ERRO:', error)
    console.error('Stack:', error.stack)
    return Response.json({ error: error.message }, { status: 500 })
  }
}