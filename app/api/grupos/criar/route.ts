// app/api/grupos/criar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { generateUniqueSlug } from '@/lib/slug-utils'

export async function POST(request: NextRequest) {
  try {
    const { name, icon, creatorUsername, creatorData } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 CRIAR GRUPO COM SLUG')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Nome:', name)
    console.log('👤 Criador:', creatorUsername)
    console.log('📊 Dados do criador recebidos:', creatorData ? 'SIM ✅' : 'NÃO ❌')

    // Validação
    if (!name || !creatorUsername) {
      return NextResponse.json(
        { error: 'Nome e criador são obrigatórios' },
        { status: 400 }
      )
    }

    // 🔥 VALIDAÇÃO DOS DADOS DO CRIADOR
    if (!creatorData) {
      console.error('❌ Dados do criador não foram enviados!')
      return NextResponse.json(
        { error: 'Dados do criador não fornecidos' },
        { status: 400 }
      )
    }

    // ✅ USA OS DADOS QUE VIERAM DO FRONTEND (NÃO BUSCA DO BANCO)
    console.log('✅ Usando dados do frontend:')
    console.log('   - Username:', creatorData.username)
    console.log('   - Nome completo:', creatorData.fullName)
    console.log('   - Foto:', creatorData.profilePic ? 'SIM ✅' : 'NÃO ❌')
    console.log('   - Seguidores:', creatorData.followers)
    console.log('')

    // 🔥 SINCRONIZAR COM O BANCO (OPCIONAL MAS RECOMENDADO)
    try {
      console.log('💾 Sincronizando criador com o banco...')
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/usuarios/sincronizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creatorData.username,
          fullName: creatorData.fullName,
          profilePic: creatorData.profilePic,
          followers: creatorData.followers,
          following: creatorData.following || 0,
          posts: creatorData.posts || 0,
          biography: creatorData.biography || '',
          isVerified: creatorData.isVerified || false,
          isPrivate: creatorData.isPrivate || false,
          instagramId: creatorData.username
        })
      })
      console.log('✅ Criador sincronizado no banco!')
    } catch (syncError) {
      console.warn('⚠️ Falha ao sincronizar criador (continuando mesmo assim):', syncError)
    }

    // ✨ GERAR SLUG ÚNICO
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

    // Inserir grupo com slug
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

    // Adicionar criador como membro
    console.log('👥 Adicionando criador como membro...')
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
        ${creatorData.following || 0},
        ${creatorData.posts || 0},
        ${creatorData.biography || ''},
        ${creatorData.isPrivate || false},
        ${creatorData.isVerified || false}
      )
    `
    console.log('✅ Criador adicionado!')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 GRUPO CRIADO COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Resumo:')
    console.log('   - Slug:', slug)
    console.log('   - Nome:', name)
    console.log('   - URL:', `/grupo/${slug}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    return NextResponse.json({
      success: true,
      groupId: slug,
      slug: slug,
      name: name,
      creator: {
        username: creatorData.username,
        fullName: creatorData.fullName,
        profilePic: creatorData.profilePic,
        followers: creatorData.followers
      }
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