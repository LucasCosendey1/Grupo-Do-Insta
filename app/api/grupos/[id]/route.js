import { sql } from '@vercel/postgres'

// 🚨 COMANDOS ANTI-CACHE
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

    console.log('🔑 [API] Identificador recebido:', id)

    // ✨ SUPORTE A SLUG E ID ANTIGO (Backward Compatibility)
    let grupoResult

    if (id.startsWith('G-')) {
      // Formato ANTIGO: G-1234567890-abc123
      console.log('📌 [API] Usando busca por ID antigo')
      grupoResult = await sql`
        SELECT * FROM grupos WHERE id = ${id}
      `
    } else {
      // Formato NOVO: abc-nome-do-grupo (slug)
      console.log('📌 [API] Usando busca por SLUG')
      grupoResult = await sql`
        SELECT * FROM grupos WHERE slug = ${id}
      `
    }

    if (grupoResult.rows.length === 0) {
      console.log('❌ [API] Grupo não encontrado')
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const grupo = grupoResult.rows[0]
    const criadorUsername = grupo.creator_username || ''
    const grupoIdReal = grupo.slug || grupo.id // Prioriza slug se existir
    
    console.log('✅ [API] Grupo encontrado:', grupo.name)
    console.log('👑 [API] Criador:', criadorUsername)
    console.log('🔗 [API] Slug:', grupo.slug || 'N/A (formato antigo)')

    // 2. Buscar TODOS os membros usando o ID/slug correto
    const timestamp = Date.now() 
    console.log('📋 [API] Buscando todos os membros...')
    
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
      WHERE grupo_id = ${grupoIdReal}
      AND ${timestamp} = ${timestamp} 
      ORDER BY added_at ASC
    `

    console.log('📊 [API] Membros encontrados:', membrosResult.rows.length)

    // 3. Montar array de perfis com a tag "isCreator"
    const profiles = membrosResult.rows.map((m) => {
      const ehODono = m.username.toLowerCase() === criadorUsername.toLowerCase()

      return {
        username: m.username,
        fullName: m.full_name || m.username,
        profilePic: m.profile_pic || `https://ui-avatars.com/api/?name=${m.username}&size=200&background=00bfff&color=fff`,
        followers: m.followers || 0,
        following: m.following || 0,
        posts: m.posts || 0,
        biography: m.biography || '',
        isPrivate: m.is_private || false,
        isVerified: m.is_verified || false,
        isCreator: ehODono
      }
    })

    const responseData = {
      success: true,
      group: {
        id: grupoIdReal,              // ✨ Retorna slug se disponível
        slug: grupo.slug || grupo.id, // ✨ Sempre retorna slug (ou ID antigo como fallback)
        name: grupo.name,
        icon: {
          emoji: grupo.icon_emoji,
          name: grupo.icon_name
        },
        profiles: profiles,
        createdAt: grupo.created_at
      }
    }

    console.log('✅ [API] Resposta preparada com sucesso')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

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