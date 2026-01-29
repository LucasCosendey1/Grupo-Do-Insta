// app/api/grupos/criar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { generateUniqueSlug } from '@/lib/slug-utils'

export async function POST(request: NextRequest) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 CRIAR GRUPO (BUSCANDO DO INSTAGRAM)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Nome:', name)
    console.log('👤 Criador:', creatorUsername)

    if (!name || !creatorUsername) {
      return NextResponse.json(
        { error: 'Nome e criador são obrigatórios' },
        { status: 400 }
      )
    }

    // 🔥 BUSCAR DADOS DO INSTAGRAM (igual aos outros membros)
    console.log('🔍 Buscando dados do criador no INSTAGRAM...')
    
    // Detectar URL base
    const getBaseUrl = () => {
      const host = request.headers.get('host')
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      
      if (host) {
        return `${protocol}://${host}`
      }
      
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`
      }
      
      return 'http://localhost:3000'
    }
    
    const baseUrl = getBaseUrl()
    console.log('🌐 Base URL:', baseUrl)
    
    const scrapeResponse = await fetch(`${baseUrl}/api/scrape?username=${creatorUsername}`)
    
    if (!scrapeResponse.ok) {
      console.error('❌ Falha ao buscar dados do Instagram')
      return NextResponse.json(
        { error: 'Não foi possível buscar dados do Instagram. Tente novamente.' },
        { status: 500 }
      )
    }
    
    const creatorData = await scrapeResponse.json()
    
    console.log('✅ Dados do criador obtidos do INSTAGRAM:')
    console.log('   - Username:', creatorData.username)
    console.log('   - Followers:', creatorData.followers)
    console.log('   - Following:', creatorData.following)
    console.log('   - Posts:', creatorData.posts)
    console.log('   - Bio:', creatorData.biography ? `"${creatorData.biography.substring(0, 30)}..."` : 'VAZIO')
    console.log('')

    // 🔥 SINCRONIZAR COM BANCO (opcional mas recomendado)
    try {
      console.log('💾 Sincronizando criador no banco de usuários...')
      await fetch(`${baseUrl}/api/usuarios/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creatorData.username,
          fullName: creatorData.fullName,
          profilePic: creatorData.profilePic,
          followers: creatorData.followers,
          following: creatorData.following,
          posts: creatorData.posts,
          biography: creatorData.biography,
          isVerified: creatorData.isVerified,
          isPrivate: creatorData.isPrivate,
          instagramId: creatorData.username
        })
      })
      console.log('✅ Criador sincronizado no banco!')
    } catch (syncError) {
      console.warn('⚠️ Falha ao sincronizar (continuando mesmo assim):', syncError)
    }

    // Gerar slug
    console.log('🔗 Gerando slug único...')
    const slug = await generateUniqueSlug(
      name,
      async (testSlug) => {
        const result = await sql`SELECT id FROM grupos WHERE slug = ${testSlug}`
        return result.rows.length > 0
      }
    )
    console.log('✅ Slug gerado:', slug)
    console.log('')

    // Inserir grupo
    console.log('💾 Inserindo grupo no banco...')
    await sql`
      INSERT INTO grupos (id, slug, name, icon_emoji, icon_name, creator_username)
      VALUES (
        ${slug},
        ${slug},
        ${name},
        ${icon?.emoji || '⚡'},
        ${icon?.name || 'Raio'},
        ${creatorUsername}
      )
    `
    console.log('✅ Grupo inserido!')
    console.log('')

    // 🔥 ADICIONAR CRIADOR (igual aos outros membros)
    console.log('👥 Adicionando criador como membro (dados do Instagram)...')
    await sql`
      INSERT INTO grupo_membros (
        grupo_id, username, full_name, profile_pic, followers, 
        following, posts, biography, is_private, is_verified
      )
      VALUES (
        ${slug},
        ${creatorData.username},
        ${creatorData.fullName || creatorData.username},
        ${creatorData.profilePic || ''},
        ${creatorData.followers || 0},
        ${creatorData.following || 0},      -- ✅ DO INSTAGRAM
        ${creatorData.posts || 0},          -- ✅ DO INSTAGRAM
        ${creatorData.biography || ''},     -- ✅ DO INSTAGRAM
        ${creatorData.isPrivate || false},
        ${creatorData.isVerified || false}
      )
    `
    console.log('✅ Criador adicionado com dados COMPLETOS!')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 GRUPO CRIADO COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Resumo:')
    console.log('   - Slug:', slug)
    console.log('   - Nome:', name)
    console.log('   - Following:', creatorData.following)
    console.log('   - Posts:', creatorData.posts)
    console.log('   - Bio:', creatorData.biography || 'N/A')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    return NextResponse.json({
      success: true,
      groupId: slug,
      slug: slug,
      name: name
    })

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO AO CRIAR GRUPO!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Tipo:', error instanceof Error ? error.constructor.name : 'Unknown')
    console.error('Mensagem:', error instanceof Error ? error.message : 'Erro desconhecido')
    console.error('')
    console.error('Stack trace:')
    console.error(error instanceof Error ? error.stack : 'N/A')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    
    return NextResponse.json(
      { error: 'Erro ao criar grupo. Tente novamente.' },
      { status: 500 }
    )
  }
}