import { sql } from '@vercel/postgres'

console.log('🔌 [API] POSTGRES_URL:', process.env.POSTGRES_URL?.substring(0, 50) + '...')

export async function GET(request, { params }) {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [API] Nova requisição:', new Date().toISOString())
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

    // Buscar APENAS membros que NÃO são o criador
    console.log('📋 [API] Buscando membros (SEM criador)...')
    
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
      AND LOWER(username) != LOWER(${grupo.creator_username})
    ORDER BY added_at ASC
    `

    console.log('📊 [API] Membros encontrados:', membrosResult.rows.length)
    console.log('👥 [API] Usernames:', membrosResult.rows.map(m => m.username).join(', '))

    // Se não encontrou ninguém, buscar TODOS para debug
    if (membrosResult.rows.length === 0) {
      console.log('⚠️  Nenhum membro além do criador!')
      
      const todosResult = await sql`
        SELECT username FROM grupo_membros WHERE grupo_id = ${id}
      `
      
      console.log('📊 Total no banco:', todosResult.rows.length)
      todosResult.rows.forEach(m => {
        console.log(`   - @${m.username}`)
      })
    }

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

    console.log('📤 [API] Retornando', profiles.length, 'perfis')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const responseData = {
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

    // ✅ CRIAR Response com headers anti-cache FORTES
    const response = new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store'
      }
    })

    return response

  } catch (error) {
    console.error('❌ [API] ERRO:', error)
    console.error('Stack:', error.stack)
    return Response.json({ error: error.message }, { status: 500 })
  }
}