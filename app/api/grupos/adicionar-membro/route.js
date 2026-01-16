import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username, profileData } = await request.json()

    if (!groupId || !username) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    console.log('➕ Adicionando membro:', username, 'ao grupo', groupId)
    console.log('📦 Dados recebidos:', profileData ? 'SIM' : 'NÃO')

    // Verificar se grupo existe
    const grupoCheck = await sql`
      SELECT id FROM grupos WHERE id = ${groupId}
    `

    if (grupoCheck.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    // Buscar dados do perfil se não foram enviados
    let fullProfileData = profileData
    
    if (!fullProfileData || !fullProfileData.profilePic) {
      console.log('🔍 Buscando dados do perfil via API...')
      
      const origin = request.headers.get('origin') || 'http://localhost:3000'
      const scrapeResponse = await fetch(`${origin}/api/scrape?username=${username}`)
      
      if (scrapeResponse.ok) {
        fullProfileData = await scrapeResponse.json()
        console.log('✅ Dados completos obtidos da API')
      } else {
        console.warn('⚠️ Não foi possível buscar dados completos do perfil')
        fullProfileData = {
          username: username,
          fullName: username,
          profilePic: '',
          followers: 0,
          following: 0,
          posts: 0,
          biography: '',
          isPrivate: false,
          isVerified: false
        }
      }
    }

    console.log('💾 Salvando no banco...')
    console.log('   - username:', fullProfileData.username)
    console.log('   - fullName:', fullProfileData.fullName)
    console.log('   - profilePic:', fullProfileData.profilePic ? 'SIM' : 'NÃO')
    console.log('   - followers:', fullProfileData.followers)

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
          ${fullProfileData.fullName || username},
          ${fullProfileData.profilePic || ''},
          ${fullProfileData.followers || 0},
          ${fullProfileData.following || 0},
          ${fullProfileData.posts || 0},
          ${fullProfileData.biography || ''},
          ${fullProfileData.isPrivate || false},
          ${fullProfileData.isVerified || false}
        )
      `

      // Atualizar timestamp do grupo
      await sql`
        UPDATE grupos SET updated_at = NOW() WHERE id = ${groupId}
      `

      console.log('✅ Membro adicionado com dados completos')

      return Response.json({ 
        success: true,
        profile: fullProfileData 
      })

    } catch (insertError) {
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