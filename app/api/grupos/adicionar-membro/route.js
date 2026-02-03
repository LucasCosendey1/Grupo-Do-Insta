// app/api/grupos/adicionar-membro/route.js
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service' // 🔥 Importando o cérebro

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { groupId, username } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('➕ [API] ADICIONAR MEMBRO (MODO OTIMIZADO)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 groupId:', groupId)
    console.log('👤 username:', username)

    // Validação básica
    if (!groupId || !username) {
      console.error('❌ Dados incompletos!')
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()

    // 1️⃣ VERIFICAR SE O GRUPO EXISTE
    // (Aceita tanto ID quanto SLUG para flexibilidade)
    const grupoCheck = await sql`
      SELECT id FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1
    `

    if (grupoCheck.rows.length === 0) {
      console.error('❌ Grupo não encontrado!')
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }
    
    const realGroupId = grupoCheck.rows[0].id
    console.log(`✅ Grupo encontrado: ${realGroupId}`)

    // 2️⃣ VERIFICAR SE JÁ ESTÁ NO GRUPO (Fast Check)
    const memberCheck = await sql`
      SELECT id FROM grupo_membros 
      WHERE grupo_id = ${realGroupId} AND username = ${cleanUsername}
    `

    if (memberCheck.rows.length > 0) {
      console.log('⚠️ Usuário já é membro.')
      return Response.json({ 
        success: true, 
        message: 'Usuário já está no grupo',
        alreadyMember: true 
      })
    }

    // 3️⃣ BUSCAR DADOS DO USUÁRIO (Lógica Cache-First)
    console.log(`🔍 Buscando dados de @${cleanUsername}...`)
    
    let userData = null
    
    // Tenta pegar do Cache (Banco de Dados)
    const dbCache = await sql`
        SELECT * FROM usuarios 
        WHERE username = ${cleanUsername} 
        AND updated_at > NOW() - INTERVAL '24 hours'
    `

    if (dbCache.rows.length > 0) {
        console.log('✅ Usuário encontrado no Cache (Banco)!')
        const cache = dbCache.rows[0]
        userData = {
            username: cache.username,
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
        console.log('🌍 Buscando no Instagram via Service...')
        // Chama a lib direto (sem fetch interno)
        userData = await scrapeInstagramProfile(cleanUsername)
    }

    if (!userData) {
      console.error('❌ Perfil não encontrado ou privado.')
      return Response.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // 4️⃣ SALVAR NA TABELA MESTRA (Usuarios)
    console.log('💾 Atualizando tabela mestra de usuários...')
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
    const dadosParaInserir = {
      grupo_id: realGroupId,
      username: userData.username,
      full_name: userData.fullName || userData.username,
      profile_pic: userData.profilePic || '',
      followers: userData.followers || 0,
      following: userData.following || 0,
      posts: userData.posts || 0,
      biography: userData.biography || '',
      is_private: userData.isPrivate === true,
      is_verified: userData.isVerified === true
    }

    console.log('')
    console.log('💾 Executando INSERT no Grupo...')
    console.log(` 📸 Foto URL: ${dadosParaInserir.profile_pic.substring(0, 50)}...`)

    await sql`
      INSERT INTO grupo_membros (
        grupo_id, username, full_name, profile_pic, followers, 
        following, posts, biography, is_private, is_verified, added_at
      )
      VALUES (
        ${dadosParaInserir.grupo_id},
        ${dadosParaInserir.username},
        ${dadosParaInserir.full_name},
        ${dadosParaInserir.profile_pic},
        ${dadosParaInserir.followers},
        ${dadosParaInserir.following},
        ${dadosParaInserir.posts},
        ${dadosParaInserir.biography},
        ${dadosParaInserir.is_private},
        ${dadosParaInserir.is_verified},
        NOW()
      )
    `

    // Atualizar timestamp do grupo para indicar atividade
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`

    console.log('✅ INSERT bem-sucedido!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return Response.json({ 
      success: true,
      username: userData.username,
      profilePic: userData.profilePic
    })

  } catch (error) {
    console.error('❌ Erro ao adicionar membro:', error)
    
    // Tratamento de erros específicos
    if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return Response.json({ error: 'Usuário já está no grupo' }, { status: 400 })
    }

    return Response.json({ 
      error: error.message || 'Erro interno',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}