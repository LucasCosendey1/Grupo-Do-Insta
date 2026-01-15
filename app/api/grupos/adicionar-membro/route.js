import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username, profileData } = await request.json()

    if (!groupId || !username) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    console.log('➕ Adicionando membro:', username, 'ao grupo', groupId)

    // Verificar se grupo existe
    const grupoCheck = await sql`
      SELECT id FROM grupos WHERE id = ${groupId}
    `

    if (grupoCheck.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    // Buscar dados do perfil se não foram enviados
    let fullProfileData = profileData
    
    if (!fullProfileData) {
      console.log('🔍 Buscando dados do perfil via API...')
      const scrapeResponse = await fetch(`${request.headers.get('origin')}/api/scrape?username=${username}`)
      
      if (scrapeResponse.ok) {
        fullProfileData = await scrapeResponse.json()
      } else {
        console.warn('⚠️ Não foi possível buscar dados completos do perfil')
      }
    }

    // Adicionar membro (UNIQUE constraint evita duplicatas)
    try {
      await sql`
        INSERT INTO grupo_membros (
          grupo_id, 
          username,
          full_name,
          profile_pic,
          followers,
          following,
          posts,
          biography,
          is_private,
          is_verified
        )
        VALUES (
          ${groupId},
          ${username},
          ${fullProfileData?.fullName || username},
          ${fullProfileData?.profilePic || ''},
          ${fullProfileData?.followers || 0},
          ${fullProfileData?.following || 0},
          ${fullProfileData?.posts || 0},
          ${fullProfileData?.biography || ''},
          ${fullProfileData?.isPrivate || false},
          ${fullProfileData?.isVerified || false}
        )
      `

      // Atualizar timestamp do grupo
      await sql`
        UPDATE grupos SET updated_at = NOW() WHERE id = ${groupId}
      `

      console.log('✅ Membro adicionado com dados completos:', username)

      return Response.json({ 
        success: true,
        profile: fullProfileData 
      })

    } catch (insertError) {
      // Erro de constraint = membro já existe
      if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
        return Response.json({ error: 'Usuário já está no grupo' }, { status: 400 })
      }
      throw insertError
    }

  } catch (error) {
    console.error('❌ Erro ao adicionar membro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}