import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    if (!name || !creatorUsername) {
      return Response.json({ error: 'Nome e criador são obrigatórios' }, { status: 400 })
    }

    console.log('🚀 Criando grupo:', name, 'por', creatorUsername)

    // Gerar ID único
    const groupId = `G-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // ✅ CORREÇÃO: Detectar URL base corretamente no Vercel
    const getBaseUrl = () => {
      // Tentar pegar o host real da requisição
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      
      if (host) {
        console.log('📍 Usando host da requisição:', host)
        return `${protocol}://${host}`
      }
      
      // Fallback para variável de ambiente do Vercel
      if (process.env.VERCEL_URL) {
        console.log('📍 Usando VERCEL_URL:', process.env.VERCEL_URL)
        return `https://${process.env.VERCEL_URL}`
      }
      
      // Último fallback para desenvolvimento local
      console.log('📍 Usando localhost (desenvolvimento)')
      return 'http://localhost:3000'
    }
    
    const baseUrl = getBaseUrl()
    console.log('🌐 Base URL final:', baseUrl)
    
    // Buscar dados completos do criador
    console.log('🔍 Buscando dados do criador...')
    
    const scrapeResponse = await fetch(`${baseUrl}/api/scrape?username=${creatorUsername}`)
    
    let creatorData = null
    if (scrapeResponse.ok) {
      creatorData = await scrapeResponse.json()
      console.log('✅ Dados do criador obtidos')
    } else {
      console.warn('⚠️ Não foi possível buscar dados do criador, usando dados básicos')
      console.warn('   Status:', scrapeResponse.status)
      console.warn('   URL tentada:', `${baseUrl}/api/scrape?username=${creatorUsername}`)
    }

    // Criar grupo
    await sql`
      INSERT INTO grupos (id, name, icon_emoji, icon_name, creator_username)
      VALUES (
        ${groupId},
        ${name},
        ${icon?.emoji || '⚡'},
        ${icon?.name || 'Raio'},
        ${creatorUsername}
      )
    `

    console.log('✅ Grupo criado no banco')

    // Adicionar criador como primeiro membro COM DADOS COMPLETOS
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
        ${creatorUsername},
        ${creatorData?.fullName || creatorUsername},
        ${creatorData?.profilePic || ''},
        ${creatorData?.followers || 0},
        ${creatorData?.following || 0},
        ${creatorData?.posts || 0},
        ${creatorData?.biography || ''},
        ${creatorData?.isPrivate || false},
        ${creatorData?.isVerified || false}
      )
    `

    console.log('✅ Criador adicionado como membro com dados completos')

    return Response.json({
      success: true,
      groupId: groupId,
      name: name
    })

  } catch (error) {
    console.error('❌ Erro ao criar grupo:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}