// app/api/usuarios/sincronizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.username) {
      return NextResponse.json(
        { success: false, error: 'Username é obrigatório' },
        { status: 400 }
      )
    }

    // 🔥 A CORREÇÃO FINAL: Forçar tudo para minúsculo
    const cleanUsername = body.username.toLowerCase().trim()
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 SINCRONIZAR/ATUALIZAR USUÁRIO (FIX CASE)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Username:', cleanUsername)
    console.log('Followers:', body.followers)
    
    // 🔥 UPSERT: Insere OU atualiza usando o username limpo
    const result = await sql`
      INSERT INTO usuarios (
        username,
        full_name,
        profile_pic,
        followers,
        following,
        posts,
        biography,
        is_verified,
        is_private,
        instagram_id,
        last_login
      ) VALUES (
        ${cleanUsername},
        ${body.fullName || cleanUsername},
        ${body.profilePic || ''},
        ${body.followers || 0},
        ${body.following || 0},
        ${body.posts || 0},
        ${body.biography || ''},
        ${body.isVerified || false},
        ${body.isPrivate || false},
        ${body.instagramId || cleanUsername},
        NOW()
      )
      ON CONFLICT (username) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,
        posts = EXCLUDED.posts,
        biography = EXCLUDED.biography,
        is_verified = EXCLUDED.is_verified,
        is_private = EXCLUDED.is_private,
        instagram_id = EXCLUDED.instagram_id,
        last_login = NOW()
      RETURNING *
    `
    
    console.log('✅ DADOS SINCRONIZADOS!')

    return NextResponse.json({
      success: true,
      message: 'Dados sincronizados com sucesso',
      data: {
        id: result.rows[0].id,
        username: result.rows[0].username, // Retornará minúsculo agora
        fullName: result.rows[0].full_name,
        followers: result.rows[0].followers,
        following: result.rows[0].following,
        posts: result.rows[0].posts,
        biography: result.rows[0].biography,
        lastLogin: result.rows[0].last_login
      }
    })
    
  } catch (error: any) {
    console.error('❌ ERRO NA SINCRONIZAÇÃO:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao sincronizar dados.',
        details: error.message
      },
      { status: 500 }
    )
  }
}