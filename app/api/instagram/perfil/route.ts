/**
 * app/api/instagram/perfil/route.ts
 *
 * API central de busca de perfil do Instagram.
 *
 * GET /api/instagram/perfil?username=xxx
 *
 * FLUXO:
 *  1. Busca no banco (tabela usuarios)
 *  2a. Não existe → chama RapidAPI → salva com migrated_pic=true → retorna
 *  2b. Existe + migrated_pic=true → retorna do banco direto (rápido, sem custo)
 *  2c. Existe + migrated_pic=false → chama RapidAPI → atualiza foto → retorna
 *
 * POST /api/instagram/perfil
 *  → Salva/atualiza o perfil no banco quando o usuário confirma o login
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getInstagramProfile } from '@/lib/instagram-api'

// ─── GET — Buscar perfil ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '').trim().toLowerCase()

  if (!username) {
    return NextResponse.json(
      { success: false, error: 'username é obrigatório' },
      { status: 400 }
    )
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🔍 [API] Buscando perfil: @${username}`)

  try {
    // ── 1. Verificar no banco ─────────────────────────────────────────────────
    const dbResult = await sql`
      SELECT
        username,
        full_name,
        profile_pic,
        biography,
        followers,
        following,
        posts,
        is_private,
        is_verified,
        instagram_id,
        migrated_pic
      FROM usuarios
      WHERE username = ${username}
    `

    const existe = dbResult.rows.length > 0
    const row = existe ? dbResult.rows[0] : null

    // ── 2b. Existe E já migrado → retorna do banco direto ─────────────────────
    if (existe && row && row.migrated_pic === true) {
      console.log(`✅ [API] Encontrado no banco (migrado) — retornando direto`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return NextResponse.json({
        success: true,
        source: 'database',
        profile: mapRow(row),
      })
    }

    // ── 2a/2c. Não existe OU não migrado → chamar RapidAPI ────────────────────
    if (existe && row && row.migrated_pic === false) {
      console.log(`🔄 [API] Encontrado no banco mas NÃO migrado — atualizando via RapidAPI...`)
    } else {
      console.log(`🌐 [API] Não encontrado no banco — chamando RapidAPI...`)
    }

    const profile = await getInstagramProfile(username)

    if (!profile) {
      // Se a API falhou mas o usuário existe no banco, retorna o que tem
      if (existe && row) {
        console.log(`⚠️  [API] Scraping falhou — retornando dados antigos do banco`)
        return NextResponse.json({
          success: true,
          source: 'database_fallback',
          profile: mapRow(row),
        })
      }

      return NextResponse.json(
        { success: false, error: `Perfil @${username} não encontrado` },
        { status: 404 }
      )
    }

    // ── Salvar/atualizar no banco com migrated_pic = true ─────────────────────
    await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, biography,
        followers, following, posts,
        is_private, is_verified, instagram_id,
        migrated_pic, last_login
      ) VALUES (
        ${profile.username},
        ${profile.fullName},
        ${profile.profilePic},
        ${profile.biography},
        ${profile.followers},
        ${profile.following},
        ${profile.posts},
        ${profile.isPrivate},
        ${profile.isVerified},
        ${profile.instagramId},
        true,
        NOW()
      )
      ON CONFLICT (username)
      DO UPDATE SET
        full_name    = EXCLUDED.full_name,
        -- Fontes gratuitas podem retornar dados parciais:
        -- não sobrescrever foto/bio/posts existentes com vazio
        profile_pic  = COALESCE(NULLIF(EXCLUDED.profile_pic, ''), usuarios.profile_pic),
        biography    = COALESCE(NULLIF(EXCLUDED.biography, ''), usuarios.biography),
        followers    = EXCLUDED.followers,
        following    = CASE WHEN EXCLUDED.following = 0 THEN usuarios.following ELSE EXCLUDED.following END,
        posts        = CASE WHEN EXCLUDED.posts = 0 THEN usuarios.posts ELSE EXCLUDED.posts END,
        is_private   = EXCLUDED.is_private,
        is_verified  = EXCLUDED.is_verified,
        instagram_id = EXCLUDED.instagram_id,
        migrated_pic = true,
        last_login   = NOW()
    `

    console.log(`✅ [API] Perfil salvo/atualizado no banco com migrated_pic=true`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      source: existe ? 'rapidapi_updated' : 'rapidapi_new',
      profile,
    })

  } catch (error) {
    console.error('❌ [API] Erro:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ─── POST — Confirmar login (salvar perfil completo no banco) ─────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, profile } = body

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'username é obrigatório' },
        { status: 400 }
      )
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`💾 [API] Confirmando login: @${username}`)

    // Se o frontend mandou o profile completo (do GET anterior), usa direto
    // Caso contrário, busca novamente
    let dadosFinal = profile

    if (!dadosFinal?.fullName) {
      console.log('🌐 [API] Buscando dados na RapidAPI...')
      dadosFinal = await getInstagramProfile(username)
      if (!dadosFinal) {
        return NextResponse.json(
          { success: false, error: 'Não foi possível obter dados do Instagram' },
          { status: 500 }
        )
      }
    }

    const saved = await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, biography,
        followers, following, posts,
        is_private, is_verified, instagram_id,
        migrated_pic, last_login
      ) VALUES (
        ${username},
        ${dadosFinal.fullName    || username},
        ${dadosFinal.profilePic  || ''},
        ${dadosFinal.biography   || ''},
        ${dadosFinal.followers   || 0},
        ${dadosFinal.following   || 0},
        ${dadosFinal.posts       || 0},
        ${dadosFinal.isPrivate   ?? false},
        ${dadosFinal.isVerified  ?? false},
        ${dadosFinal.instagramId || username},
        true,
        NOW()
      )
      ON CONFLICT (username)
      DO UPDATE SET
        full_name    = EXCLUDED.full_name,
        profile_pic  = EXCLUDED.profile_pic,
        biography    = EXCLUDED.biography,
        followers    = EXCLUDED.followers,
        following    = EXCLUDED.following,
        posts        = EXCLUDED.posts,
        is_private   = EXCLUDED.is_private,
        is_verified  = EXCLUDED.is_verified,
        instagram_id = EXCLUDED.instagram_id,
        migrated_pic = true,
        last_login   = NOW()
      RETURNING username, full_name, followers, last_login
    `

    const row = saved.rows[0]
    console.log(`✅ [API] Login confirmado para @${row.username}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      message: 'Login confirmado!',
      data: {
        username:  row.username,
        fullName:  row.full_name,
        followers: row.followers,
        lastLogin: row.last_login,
      },
    })

  } catch (error) {
    console.error('❌ [API] Erro no POST:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar perfil' },
      { status: 500 }
    )
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>) {
  return {
    username:    row.username,
    fullName:    row.full_name,
    profilePic:  row.profile_pic  || '',
    biography:   row.biography    || '',
    followers:   row.followers    || 0,
    following:   row.following    || 0,
    posts:       row.posts        || 0,
    isPrivate:   row.is_private   || false,
    isVerified:  row.is_verified  || false,
    instagramId: row.instagram_id || row.username,
  }
}