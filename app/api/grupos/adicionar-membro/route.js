// app/api/grupos/adicionar-membro/route.js
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { groupId, username } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('➕ [API] ADICIONAR MEMBRO (FIX CASE SENSITIVE)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Validação básica
    if (!groupId || !username) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // 🔥 FIX 1: Forçar minúsculo logo na entrada
    const cleanUsername = username.toLowerCase().trim()

    // 1️⃣ VERIFICAR SE O GRUPO EXISTE
    const grupoCheck = await sql`
      SELECT id FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1
    `

    if (grupoCheck.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }
    
    const realGroupId = grupoCheck.rows[0].id

    // 2️⃣ VERIFICAR SE JÁ ESTÁ NO GRUPO
    // Usamos LOWER() para garantir que achamos mesmo se estiver salvo como "Ata"
    const memberCheck = await sql`
      SELECT id FROM grupo_membros 
      WHERE grupo_id = ${realGroupId} 
      AND LOWER(username) = ${cleanUsername}
    `

    if (memberCheck.rows.length > 0) {
      console.log('⚠️ Usuário já é membro.')
      return Response.json({ 
        success: true, 
        message: 'Usuário já está no grupo',
        alreadyMember: true 
      })
    }

    // 3️⃣ BUSCAR DADOS DO USUÁRIO
    console.log(`🔍 Buscando dados de @${cleanUsername}...`)
    
    let userData = null
    
    // Cache do Banco (Buscando sempre em minúsculo)
    const dbCache = await sql`
        SELECT * FROM usuarios 
        WHERE username = ${cleanUsername} 
        AND updated_at > NOW() - INTERVAL '24 hours'
    `

    if (dbCache.rows.length > 0) {
        console.log('✅ Encontrado no Cache!')
        const cache = dbCache.rows[0]
        userData = {
            username: cache.username, // Já vem do banco, provavelmente correto
            fullName: cache.full_name,
            profilePic: cache.profile_pic,
            followers: cache.followers,
            following: cache.following,
            posts: cache.posts,
            biography: cache.biography,
            isPrivate: cache.is_private,
            isVerified: cache.is_verified
        }
    } else {
        console.log('🌍 Buscando no Instagram...')
        userData = await scrapeInstagramProfile(cleanUsername)
    }

    if (!userData) {
      return Response.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // 🔥 FIX 2: Garantir que o objeto final tenha o username em minúsculo
    // Mesmo que o Instagram devolva "Ata", nós salvamos "ata" para consistência
    userData.username = userData.username.toLowerCase()

    // 4️⃣ SALVAR NA TABELA MESTRA (Usuarios)
    await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, followers, following, posts, 
        biography, is_verified, is_private, instagram_id, updated_at, last_login
      ) VALUES (
        ${userData.username}, 
        ${userData.fullName}, 
        ${userData.profilePic}, 
        ${userData.followers}, 
        ${userData.following || 0}, 
        ${userData.posts || 0}, 
        ${userData.biography || ''}, 
        ${userData.isVerified || false}, 
        ${userData.isPrivate || false}, 
        ${userData.username}, 
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

    // 5️⃣ INSERIR NO GRUPO
    await sql`
      INSERT INTO grupo_membros (
        grupo_id, username, full_name, profile_pic, followers, 
        following, posts, biography, is_private, is_verified, added_at
      )
      VALUES (
        ${realGroupId},
        ${userData.username}, 
        ${userData.fullName || userData.username},
        ${userData.profilePic || ''},
        ${userData.followers || 0},
        ${userData.following || 0},
        ${userData.posts || 0},
        ${userData.biography || ''},
        ${userData.isPrivate || false},
        ${userData.isVerified || false},
        NOW()
      )
    `

    // Atualizar timestamp do grupo
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`

    console.log('✅ Membro adicionado com sucesso!')

    return Response.json({ 
      success: true,
      username: userData.username,
      profilePic: userData.profilePic
    })

  } catch (error) {
    console.error('❌ Erro ao adicionar membro:', error)
    
    // Tratamento de conflito (caso raro de corrida)
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return Response.json({ error: 'Usuário já está no grupo' }, { status: 400 })
    }

    return Response.json({ error: error.message }, { status: 500 })
  }
}