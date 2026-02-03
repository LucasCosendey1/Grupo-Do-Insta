// app/api/scrape/route.js
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

// Força que a rota seja dinâmica (não cacheada estaticamente)
export const dynamic = 'force-dynamic'

// ✅ CORREÇÃO: Removido ": Request" (Sintaxe TypeScript)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  // O JavaScript aceita o ?. (optional chaining), então isso aqui funciona:
  const username = searchParams.get('username')?.toLowerCase()

  if (!username) {
    return NextResponse.json({ error: 'Username necessário' }, { status: 400 })
  }

  try {
    // 1. VERIFICAÇÃO DE CACHE (Banco de Dados)
    const { rows } = await sql`
      SELECT * FROM usuarios 
      WHERE username = ${username} 
      AND updated_at > NOW() - INTERVAL '24 hours'
    `

    if (rows.length > 0) {
      console.log(`✅ [CACHE] Servindo @${username} direto do banco`)
      const user = rows[0]
      return NextResponse.json({
        username: user.username,
        fullName: user.full_name,
        profilePic: user.profile_pic,
        followers: user.followers,
        following: user.following,
        posts: user.posts,
        biography: user.biography,
        isPrivate: user.is_private,
        isVerified: user.is_verified,
        source: 'cache'
      })
    }

    // 2. SE NÃO TÁ NO CACHE, CHAMA O SERVICE (Scraping)
    console.log(`🔄 [API] Buscando @${username} na web...`)
    
    const data = await scrapeInstagramProfile(username)

    if (!data) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // 3. SALVA NO BANCO (UPSERT)
    await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, followers, following, posts, 
        biography, is_verified, is_private, instagram_id, updated_at, last_login
      ) VALUES (
        ${data.username}, ${data.fullName}, ${data.profilePic}, ${data.followers}, 
        ${data.following}, ${data.posts}, ${data.biography}, ${data.isVerified}, 
        ${data.isPrivate}, ${data.username}, NOW(), NOW()
      )
      ON CONFLICT (username) 
      DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        posts = EXCLUDED.posts,
        updated_at = NOW();
    `

    // Opcional: Atualiza a tabela de membros
    await sql`
      UPDATE grupo_membros SET profile_pic = ${data.profilePic}, followers = ${data.followers} 
      WHERE username = ${data.username}
    `

    return NextResponse.json({ ...data, source: 'network' })

  } catch (error) {
    console.error('❌ Erro na API Scrape:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}