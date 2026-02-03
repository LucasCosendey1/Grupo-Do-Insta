// app/api/grupos/criar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { generateUniqueSlug } from '@/lib/slug-utils'
import { scrapeInstagramProfile } from '@/lib/instagram-service' // 🔥 Importando o cérebro
import { nanoid } from 'nanoid' // Se der erro aqui, veja nota abaixo*

// Se não tiver nanoid instalado, pode usar esta função simples:
// const nanoid = (size = 10) => Math.random().toString(36).substring(2, 2 + size)

export async function POST(request: NextRequest) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 CRIAR GRUPO (MODO OTIMIZADO)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Nome:', name)
    console.log('👤 Criador:', creatorUsername)

    if (!name || !creatorUsername) {
      return NextResponse.json(
        { error: 'Nome e criador são obrigatórios' },
        { status: 400 }
      )
    }

    // 1️⃣ BUSCAR DADOS (Sem fetch interno, chamando a lib direto)
    console.log('🔍 Buscando dados do criador via Service...')
    
    // Tenta pegar do Cache primeiro (Banco) para ser ultra-rápido
    let creatorData: any = null
    
    const dbCache = await sql`
        SELECT * FROM usuarios 
        WHERE username = ${creatorUsername.toLowerCase()} 
        AND updated_at > NOW() - INTERVAL '24 hours'
    `

    if (dbCache.rows.length > 0) {
        console.log('✅ Criador encontrado no Cache (Banco)!')
        creatorData = dbCache.rows[0]
        // Ajuste de camelCase se vier do banco snake_case
        creatorData.fullName = creatorData.full_name
        creatorData.profilePic = creatorData.profile_pic
        creatorData.isVerified = creatorData.is_verified
        creatorData.isPrivate = creatorData.is_private
    } else {
        console.log('🌍 Criador não está no cache. Buscando no Instagram...')
        creatorData = await scrapeInstagramProfile(creatorUsername)
    }

    if (!creatorData) {
      console.error('❌ Falha ao obter dados do criador')
      return NextResponse.json(
        { error: 'Perfil do Instagram não encontrado ou privado.' },
        { status: 404 }
      )
    }

    console.log(`✅ Dados garantidos: @${creatorData.username} (${creatorData.followers} seg)`)

    // 2️⃣ SALVAR/ATUALIZAR USUÁRIO NA TABELA MESTRA
    // Isso substitui a chamada antiga para /api/usuarios/sincronizar
    console.log('💾 Garantindo usuário na tabela mestra...')
    await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, followers, following, posts, 
        biography, is_verified, is_private, instagram_id, updated_at, last_login
      ) VALUES (
        ${creatorData.username}, 
        ${creatorData.fullName}, 
        ${creatorData.profilePic}, 
        ${creatorData.followers}, 
        ${creatorData.following || 0}, 
        ${creatorData.posts || 0}, 
        ${creatorData.biography || ''}, 
        ${creatorData.isVerified || false}, 
        ${creatorData.isPrivate || false}, 
        ${creatorData.username}, 
        NOW(), 
        NOW()
      )
      ON CONFLICT (username) 
      DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        updated_at = NOW(),
        last_login = NOW();
    `

    // 3️⃣ GERAR ID E SLUG
    console.log('🔗 Gerando identificadores...')
    const groupId = nanoid(10) // ID curto e único (ex: V1StGXR8)
    
    const slug = await generateUniqueSlug(
      name,
      async (testSlug) => {
        const result = await sql`SELECT id FROM grupos WHERE slug = ${testSlug}`
        return result.rows.length > 0
      }
    )

    // 4️⃣ INSERIR GRUPO
    console.log('💾 Criando grupo...')
    await sql`
      INSERT INTO grupos (id, slug, name, icon_emoji, icon_name, creator_username, created_at, updated_at)
      VALUES (
        ${groupId},
        ${slug},
        ${name},
        ${icon?.emoji || '⚡'},
        ${icon?.name || 'Raio'},
        ${creatorData.username},
        NOW(),
        NOW()
      )
    `

    // 5️⃣ ADICIONAR CRIADOR COMO MEMBRO (ADMIN)
    console.log('👥 Adicionando criador à tabela de membros...')
    await sql`
      INSERT INTO grupo_membros (
        grupo_id, username, full_name, profile_pic, followers, 
        following, posts, biography, is_private, is_verified, added_at
      )
      VALUES (
        ${groupId},
        ${creatorData.username},
        ${creatorData.fullName},
        ${creatorData.profilePic},
        ${creatorData.followers},
        ${creatorData.following || 0},
        ${creatorData.posts || 0},
        ${creatorData.biography || ''},
        ${creatorData.isPrivate || false},
        ${creatorData.isVerified || false},
        NOW()
      )
    `

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 GRUPO CRIADO COM SUCESSO!')
    console.log(`🆔 ID: ${groupId} | Slug: ${slug}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      groupId: groupId, // Retorna o ID real
      slug: slug,       // Retorna o Slug amigável
      name: name
    })

  } catch (error) {
    console.error('❌ ERRO CRÍTICO AO CRIAR GRUPO:', error)
    
    // Tratamento de erro detalhado
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Erro ao criar grupo: ${msg}` },
      { status: 500 }
    )
  }
}