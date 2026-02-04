// app/api/grupos/[id]/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const identifier = params.id

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🔍 [API] Buscando grupo: ${identifier}`)

  try {
    // 🔥 CORREÇÃO MESTRA:
    // 1. COALESCE: Se não achar dados na tabela 'usuarios' (u), usa os dados da tabela 'grupo_membros' (gm).
    // 2. REMOVIDO O FILTER: Não excluímos mais ninguém. Se está no grupo, aparece na lista.
    
    const result = await sql`
      SELECT 
        g.*,
        (SELECT COUNT(*) FROM grupo_membros WHERE grupo_id = g.id) as member_count,
        COALESCE(
          json_agg(
            json_build_object(
              'username', COALESCE(u.username, gm.username), 
              'fullName', COALESCE(u.full_name, gm.full_name, gm.username),
              'profilePic', COALESCE(u.profile_pic, gm.profile_pic, ''),
              'followers', COALESCE(u.followers, gm.followers, 0),
              'following', COALESCE(u.following, gm.following, 0),
              'posts', COALESCE(u.posts, gm.posts, 0),
              'biography', COALESCE(u.biography, gm.biography, ''),
              'isVerified', COALESCE(u.is_verified, gm.is_verified, false),
              'isPrivate', COALESCE(u.is_private, gm.is_private, false),
              'isCreator', (CASE WHEN LOWER(gm.username) = LOWER(g.creator_username) THEN true ELSE false END)
            ) ORDER BY COALESCE(u.followers, gm.followers, 0) DESC
          ), 
          '[]'
        ) as profiles
      FROM grupos g
      LEFT JOIN grupo_membros gm ON g.id = gm.grupo_id
      LEFT JOIN usuarios u ON LOWER(gm.username) = LOWER(u.username)
      WHERE g.id = ${identifier} OR g.slug = ${identifier}
      GROUP BY g.id
    `

    if (result.rows.length === 0) {
      console.log('❌ [API] Grupo não encontrado')
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const groupRaw = result.rows[0]

    const group = {
      id: groupRaw.id,
      slug: groupRaw.slug,
      name: groupRaw.name,
      icon: {
        emoji: groupRaw.icon_emoji,
        name: groupRaw.icon_name
      },
      creator: groupRaw.creator_username,
      memberCount: parseInt(groupRaw.member_count),
      profiles: groupRaw.profiles || [], 
      createdAt: groupRaw.created_at
    }

    console.log(`✅ [API] Grupo encontrado: ${group.name}`)
    console.log(`👥 Membros carregados: ${group.profiles.length}`)
    
    // Debug para ver quem está vindo
    group.profiles.forEach((p: any) => console.log(`   - ${p.username}`))

    return NextResponse.json({ success: true, group })

  } catch (error: any) {
    console.error('❌ [API] Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}