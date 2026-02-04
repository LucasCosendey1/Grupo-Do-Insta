// app/api/grupos/criar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { generateUniqueSlug } from '@/lib/slug-utils'
import { scrapeInstagramProfile } from '@/lib/instagram-service'
import { nanoid } from 'nanoid'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { name, icon, creatorUsername } = await request.json()

    // 🔥 FIX 1: Normalização imediata (tudo minúsculo)
    const cleanUsername = creatorUsername?.toLowerCase().trim()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚀 CRIAR GRUPO (FRESH DATA MODE)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 Nome:', name)
    console.log('👤 Criador:', cleanUsername)

    if (!name || !cleanUsername) {
      return NextResponse.json(
        { error: 'Nome e criador são obrigatórios' },
        { status: 400 }
      )
    }

    // 1️⃣ BUSCAR DADOS (Modo: SEMPRE ATUALIZAR PRIMEIRO)
    console.log('🌍 Buscando dados frescos no Instagram...')
    
    let creatorData: any = null
    
    // Tenta o Scraper primeiro para garantir dados novos (Bio, Posts, etc)
    const scrapedData = await scrapeInstagramProfile(cleanUsername)

    if (scrapedData) {
        console.log('✅ Dados obtidos com sucesso do Instagram!')
        creatorData = scrapedData
        creatorData.username = cleanUsername // Garante consistência
    } else {
        // Só usa o banco se o Instagram falhar (Fallback de segurança)
        console.log('⚠️ Scrape falhou ou demorou. Usando cache do banco (Fallback)...')
        const dbCache = await sql`
            SELECT * FROM usuarios WHERE username = ${cleanUsername}
        `
        
        if (dbCache.rows.length > 0) {
            const cache = dbCache.rows[0]
            creatorData = {
                username: cache.username,
                fullName: cache.full_name,
                profilePic: cache.profile_pic,
                followers: cache.followers,
                following: cache.following,
                posts: cache.posts,
                biography: cache.biography,
                isVerified: cache.is_verified,
                isPrivate: cache.is_private
            }
            console.log('📦 Usando dados do banco.')
        }
    }

    if (!creatorData) {
      console.error('❌ Falha fatal: Perfil não encontrado.')
      return NextResponse.json(
        { error: 'Perfil do Instagram não encontrado.' },
        { status: 404 }
      )
    }

    console.log(`✅ Dados finais para gravação: ${creatorData.posts} posts, ${creatorData.following} seguindo`)

    // 2️⃣ SALVAR/ATUALIZAR NA TABELA MESTRA (Upsert Completo)
    console.log('💾 Atualizando tabela de usuários...')
    await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, followers, following, posts, 
        biography, is_verified, is_private, instagram_id, updated_at, last_login
      ) VALUES (
        ${cleanUsername}, 
        ${creatorData.fullName}, 
        ${creatorData.profilePic}, 
        ${creatorData.followers}, 
        ${creatorData.following || 0}, 
        ${creatorData.posts || 0}, 
        ${creatorData.biography || ''}, 
        ${creatorData.isVerified || false}, 
        ${creatorData.isPrivate || false}, 
        ${cleanUsername}, 
        NOW(), 
        NOW()
      )
      ON CONFLICT (username) 
      DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,   -- 🔥 Garante update
        posts = EXCLUDED.posts,           -- 🔥 Garante update
        biography = EXCLUDED.biography,   -- 🔥 Garante update
        updated_at = NOW(),
        last_login = NOW();
    `

    // 3️⃣ GERAR ID E SLUG
    const groupId = nanoid(10)
    
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
        ${cleanUsername},
        NOW(),
        NOW()
      )
    `

    // 5️⃣ ADICIONAR CRIADOR COMO MEMBRO
    console.log('👥 Adicionando membro...')
    await sql`
      INSERT INTO grupo_membros (
        grupo_id, username, full_name, profile_pic, followers, 
        following, posts, biography, is_private, is_verified, added_at
      )
      VALUES (
        ${groupId},
        ${cleanUsername},
        ${creatorData.fullName || cleanUsername},
        ${creatorData.profilePic || ''},
        ${creatorData.followers || 0},
        ${creatorData.following || 0},
        ${creatorData.posts || 0},
        ${creatorData.biography || ''},
        ${creatorData.isPrivate || false},
        ${creatorData.isVerified || false},
        NOW()
      )
    `

    console.log('🎉 SUCESSO TOTAL!')
    console.log(`🆔 ID: ${groupId} | Slug: ${slug}`)

    return NextResponse.json({
      success: true,
      groupId: groupId, 
      slug: slug,      
      name: name
    })

  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO AO CRIAR GRUPO:', error)
    return NextResponse.json(
      { error: `Erro ao criar grupo: ${error.message}` },
      { status: 500 }
    )
  }
}