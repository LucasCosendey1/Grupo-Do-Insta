// app/api/grupos/criar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getOrRefreshUser } from '@/lib/sync-instagram-data'
import { generateUniqueSlug } from '@/lib/slug-utils'

export async function POST(request: NextRequest) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 CRIAR GRUPO COM SLUG')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Nome:', name)
    console.log('👤 Criador:', creatorUsername)

    // Validação
    if (!name || !creatorUsername) {
      return NextResponse.json(
        { error: 'Nome e criador são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar dados do criador
    console.log('🔍 Buscando dados do criador no banco...')
    const creatorData = await getOrRefreshUser(creatorUsername)
    
    if (!creatorData) {
      console.error('❌ Criador não encontrado no banco')
      return NextResponse.json(
        { error: 'Usuário não encontrado. Faça login primeiro.' },
        { status: 404 }
      )
    }

    console.log('✅ Dados do criador obtidos:')
    console.log('   - Username:', creatorData.username)
    console.log('   - Foto:', creatorData.profile_pic ? 'SIM ✅' : 'NÃO ❌')
    console.log('')

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
        ${creatorData.full_name || creatorData.username},
        ${creatorData.profile_pic || ''},
        ${creatorData.followers || 0},
        ${creatorData.following || 0},
        ${creatorData.posts || 0},
        ${creatorData.biography || ''},
        ${creatorData.is_private || false},
        ${creatorData.is_verified || false}
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
      groupId: slug,      // ✨ Retorna slug como groupId (retrocompatibilidade)
      slug: slug,         // ✨ Retorna slug explicitamente
      name: name,
      creator: {
        username: creatorData.username,
        fullName: creatorData.full_name,
        profilePic: creatorData.profile_pic,
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