// app/api/grupos/criar/route.ts (VERSÃO ATUALIZADA)
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getOrRefreshUser } from '@/lib/sync-instagram-data'

export async function POST(request: NextRequest) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 CRIAR GRUPO - VERSÃO ATUALIZADA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Nome do grupo:', name)
    console.log('👤 Criador:', creatorUsername)
    console.log('')

    // Validação básica
    if (!name || !creatorUsername) {
      return NextResponse.json(
        { error: 'Nome e criador são obrigatórios' },
        { status: 400 }
      )
    }

    // ✅ NOVO: Buscar dados do criador do BANCO (com auto-refresh 24h)
    console.log('🔍 Buscando dados do criador no banco...')
    const creatorData = await getOrRefreshUser(creatorUsername)

    if (!creatorData) {
      console.error('❌ Criador não encontrado no banco')
      return NextResponse.json(
        { 
          error: 'Usuário não encontrado. Faça login primeiro.',
          hint: 'O usuário precisa ter feito login pelo menos uma vez'
        },
        { status: 404 }
      )
    }

    console.log('✅ Dados do criador obtidos:')
    console.log('   - Username:', creatorData.username)
    console.log('   - Nome:', creatorData.full_name)
    console.log('   - Foto:', creatorData.profile_pic ? 'SIM ✅' : 'NÃO ❌')
    console.log('   - Seguidores:', creatorData.followers)
    console.log('   - Último login:', creatorData.last_login)
    console.log('')

    // Gerar ID único
    const groupId = `G-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    console.log('🆔 ID do grupo gerado:', groupId)
    console.log('')

    // 1. Criar grupo no banco
    console.log('💾 Criando grupo no banco...')
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
    console.log('✅ Grupo criado!')
    console.log('')

    // 2. Adicionar criador como membro usando dados do BANCO
    console.log('👥 Adicionando criador como membro...')
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
    console.log('✅ Criador adicionado como membro!')
    console.log('')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 GRUPO CRIADO COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Resumo:')
    console.log('   - ID:', groupId)
    console.log('   - Nome:', name)
    console.log('   - Criador:', creatorUsername)
    console.log('   - Foto do criador:', creatorData.profile_pic ? '✅ CORRETA' : '⚠️ GENÉRICA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    return NextResponse.json({
      success: true,
      groupId: groupId,
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