// app/api/grupos/[id]/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// 🔥 FORÇA BRUTA CONTRA CACHE (Nível Server-Side)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const identifier = params.id
  
  // Header para impedir cache em qualquer nível (Vercel/Browser/CDN)
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }

  console.log(`🔍 [API GET] Buscando dados frescos para: ${identifier}`)

  try {
    // 1. Pega o Grupo
    const grupoResult = await sql`SELECT * FROM grupos WHERE id = ${identifier} OR slug = ${identifier} LIMIT 1`
    
    if (grupoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404, headers })
    }
    
    const grupo = grupoResult.rows[0]
    const realGroupId = grupo.id

    // 2. Pega os Membros (Direto e Reto)
    const membrosResult = await sql`
      SELECT username, full_name, profile_pic, followers, following, posts, biography, is_verified, is_private
      FROM grupo_membros 
      WHERE grupo_id = ${realGroupId}
      ORDER BY followers DESC
    `

    console.log(`📋 [API GET] Membros encontrados no DB: ${membrosResult.rows.length}`)

    // 3. Mapeamento BLINDADO (Sanitização e Auto-Correção)
    const profiles = membrosResult.rows.map(row => {
      // Garante username limpo
      const safeUsername = row.username ? row.username.trim().toLowerCase() : 'unknown'
      
      // 🔥 AUTO-CORREÇÃO DE FOTO:
      // Se a foto vier vazia do banco (usuário antigo), gera o Avatar na hora!
      let safePic = String(row.profile_pic || '')
      if (safePic.length < 5 || safePic === 'undefined' || safePic === 'null') {
          safePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(safeUsername)}&size=200&background=00bfff&color=fff&bold=true`
      }

      // Garante que o criador seja identificado corretamente (case insensitive)
      const isCreator = Boolean(
          grupo.creator_username && 
          safeUsername === grupo.creator_username.toLowerCase().trim()
      )

      return {
        username: safeUsername,
        fullName: String(row.full_name || safeUsername),
        profilePic: safePic, // URL Garantida
        followers: Number(row.followers) || 0, // Nunca NaN ou null
        following: Number(row.following) || 0,
        posts: Number(row.posts) || 0,
        biography: String(row.biography || ''),
        isVerified: Boolean(row.is_verified),
        isPrivate: Boolean(row.is_private),
        isCreator: isCreator
      }
    })

    const responseData = {
      id: grupo.id,
      slug: grupo.slug,
      name: grupo.name,
      icon: { emoji: grupo.icon_emoji, name: grupo.icon_name },
      creator: grupo.creator_username,
      memberCount: profiles.length,
      profiles: profiles,
      createdAt: grupo.created_at
    }

    return NextResponse.json({ success: true, group: responseData }, { headers })

  } catch (error: any) {
    console.error('❌ Erro API GET:', error)
    return NextResponse.json({ error: 'Erro interno ao buscar grupo' }, { status: 500, headers })
  }
}