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
  console.log(`🔍 [API] Buscando grupo (Modo Robusto): ${identifier}`)

  try {
    // 1️⃣ BUSCAR O GRUPO
    const grupoResult = await sql`
      SELECT * FROM grupos 
      WHERE id = ${identifier} OR slug = ${identifier}
      LIMIT 1
    `

    if (grupoResult.rows.length === 0) {
      console.log('❌ [API] Grupo não encontrado')
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const grupo = grupoResult.rows[0]
    const realGroupId = grupo.id

    // 2️⃣ BUSCAR OS MEMBROS (Consulta Simples e Direta)
    // Sem JOIN complexo que pode ocultar dados. Pegamos tudo da tabela de ligação.
    const membrosResult = await sql`
      SELECT 
        gm.username, 
        gm.full_name, 
        gm.profile_pic, 
        gm.followers,
        gm.following,
        gm.posts,
        gm.biography,
        gm.is_verified,
        gm.is_private,
        u.instagram_id -- Tenta pegar info extra se tiver
      FROM grupo_membros gm
      LEFT JOIN usuarios u ON LOWER(gm.username) = LOWER(u.username)
      WHERE gm.grupo_id = ${realGroupId}
      ORDER BY gm.followers DESC
    `

    console.log(`👥 Membros brutos encontrados no banco: ${membrosResult.rows.length}`)

    // 3️⃣ MONTAR A RESPOSTA
    const profiles = membrosResult.rows.map(row => ({
      username: row.username,
      fullName: row.full_name || row.username,
      profilePic: row.profile_pic || '',
      followers: Number(row.followers || 0),
      following: Number(row.following || 0),
      posts: Number(row.posts || 0),
      biography: row.biography || '',
      isVerified: row.is_verified || false,
      isPrivate: row.is_private || false,
      isCreator: row.username.toLowerCase() === grupo.creator_username.toLowerCase()
    }))

    const responseData = {
      id: grupo.id,
      slug: grupo.slug,
      name: grupo.name,
      icon: {
        emoji: grupo.icon_emoji,
        name: grupo.icon_name
      },
      creator: grupo.creator_username,
      memberCount: profiles.length, // Contagem real baseada na array
      profiles: profiles,
      createdAt: grupo.created_at
    }

    console.log(`✅ [API] Retornando grupo com ${profiles.length} perfis.`)
    
    // Debug para provar que o 'ata' está indo
    const temAta = profiles.find(p => p.username.toLowerCase() === 'ata')
    if (temAta) console.log('   🎉 O usuário "ata" ESTÁ no payload de resposta!')
    else console.log('   ⚠️ O usuário "ata" AINDA NÃO apareceu. Verifique o DB.')

    return NextResponse.json({ success: true, group: responseData })

  } catch (error: any) {
    console.error('❌ [API] Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' }, 
      { status: 500 }
    )
  }
}