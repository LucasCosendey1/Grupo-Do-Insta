// app/api/usuarios/sincronizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.username) {
      return NextResponse.json(
        { success: false, error: 'Username é obrigatório' },
        { status: 400 }
      )
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 SINCRONIZAR/ATUALIZAR USUÁRIO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Username:', body.username)
    console.log('Followers:', body.followers)
    console.log('Following:', body.following, body.following ? '✅' : '❌')
    console.log('Posts:', body.posts, body.posts ? '✅' : '❌')
    console.log('Bio:', body.biography ? `"${body.biography.substring(0, 30)}..."` : 'VAZIO ❌')
    console.log('')

    // 🔥 UPSERT: Insere OU atualiza se já existir
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
        ${body.username},
        ${body.fullName || body.username},
        ${body.profilePic || ''},
        ${body.followers || 0},
        ${body.following || 0},
        ${body.posts || 0},
        ${body.biography || ''},
        ${body.isVerified || false},
        ${body.isPrivate || false},
        ${body.instagramId || body.username},
        NOW()
      )
      ON CONFLICT (username) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,      -- ✅ ATUALIZA
        posts = EXCLUDED.posts,              -- ✅ ATUALIZA
        biography = EXCLUDED.biography,      -- ✅ ATUALIZA
        is_verified = EXCLUDED.is_verified,
        is_private = EXCLUDED.is_private,
        instagram_id = EXCLUDED.instagram_id,
        last_login = NOW()
      RETURNING *
    `
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ DADOS ATUALIZADOS NO BANCO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Following no banco:', result.rows[0].following)
    console.log('Posts no banco:', result.rows[0].posts)
    console.log('Bio no banco:', result.rows[0].biography ? 'SIM ✅' : 'NÃO ❌')
    console.log('')
    
    return NextResponse.json({
      success: true,
      message: 'Dados sincronizados com sucesso',
      data: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        fullName: result.rows[0].full_name,
        followers: result.rows[0].followers,
        following: result.rows[0].following,
        posts: result.rows[0].posts,
        biography: result.rows[0].biography,
        lastLogin: result.rows[0].last_login
      }
    })
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NA SINCRONIZAÇÃO!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Tipo:', error instanceof Error ? error.constructor.name : 'Unknown')
    console.error('Mensagem:', error instanceof Error ? error.message : 'Erro desconhecido')
    console.error('')
    console.error('Stack trace:')
    console.error(error instanceof Error ? error.stack : 'N/A')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao sincronizar dados. Tente novamente.' 
      },
      { status: 500 }
    )
  }
}