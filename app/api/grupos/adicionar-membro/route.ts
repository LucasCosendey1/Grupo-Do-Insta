// app/api/grupos/adicionar-membro/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { groupId, username, profileData } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('➕ [API] ADICIONAR MEMBRO (FRESH DATA MODE)')
    console.log('📦 Grupo:', groupId)
    console.log('👤 Usuário:', username)

    if (!groupId || !username) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()

    // 1️⃣ Achar o ID Real do Grupo
    const grupoCheck = await sql`
      SELECT id FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1
    `

    if (grupoCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }
    
    const realGroupId = grupoCheck.rows[0].id

    // 2️⃣ Preparar Dados (Estratégia: SEMPRE TENTAR MELHORAR)
    let finalData = profileData || {}
    
    // Verificação de Qualidade dos Dados
    const temFoto = finalData.profilePic && finalData.profilePic.length > 5
    const temBio = finalData.biography && finalData.biography.length > 0
    const temStats = finalData.posts > 0 || finalData.following > 0
    
    // Se faltar QUALQUER coisa relevante, rodamos o Scraper
    // Isso garante que quem entra sempre traz dados frescos
    if (!temFoto || !temBio || !temStats) {
        console.log('⚠️ Dados pobres ou zerados detectados. Iniciando Scraper para enriquecer...')
        
        const scraped = await scrapeInstagramProfile(cleanUsername)
        
        if (scraped) {
            console.log('✅ Dados frescos obtidos do Instagram!')
            // Mescla: Prioriza o Scraper, mas mantem o que já tinha se o scrape falhar em algo
            finalData = { ...finalData, ...scraped }
        } else {
            console.log('⚠️ Scraper falhou. Tentando recuperar do banco de dados...')
            const dbUser = await sql`SELECT * FROM usuarios WHERE username = ${cleanUsername}`
            if (dbUser.rows.length > 0) {
                const u = dbUser.rows[0]
                finalData = {
                    username: cleanUsername,
                    fullName: u.full_name,
                    profilePic: u.profile_pic,
                    followers: u.followers,
                    following: u.following,
                    posts: u.posts,
                    biography: u.biography,
                    isVerified: u.is_verified,
                    isPrivate: u.is_private
                }
            }
        }
    } else {
        console.log('✅ Dados recebidos parecem completos. Pulando scrape.')
    }

    // Objeto seguro para salvar (Garante 0 em vez de null/undefined)
    const usuarioParaSalvar = {
        username: cleanUsername,
        fullName: finalData.fullName || cleanUsername,
        profilePic: finalData.profilePic || '',
        followers: Number(finalData.followers) || 0,
        following: Number(finalData.following) || 0,
        posts: Number(finalData.posts) || 0,
        biography: finalData.biography || '',
        isVerified: finalData.isVerified === true,
        isPrivate: finalData.isPrivate === true
    }

    console.log(`💾 Salvando: ${usuarioParaSalvar.posts} posts, ${usuarioParaSalvar.following} seguindo`)

    // 3️⃣ VERIFICAR SE JÁ EXISTE NO GRUPO (Modo Manual Seguro)
    const memberCheck = await sql`
        SELECT id FROM grupo_membros 
        WHERE grupo_id = ${realGroupId} AND username = ${cleanUsername}
    `

    if (memberCheck.rows.length > 0) {
        // --- CENÁRIO A: JÁ EXISTE (ATUALIZAR COM DADOS FRESCOS) ---
        console.log('🔄 Usuário já no grupo. Atualizando cadastro...')
        await sql`
            UPDATE grupo_membros SET
                full_name = ${usuarioParaSalvar.fullName},
                profile_pic = ${usuarioParaSalvar.profilePic},
                followers = ${usuarioParaSalvar.followers},
                following = ${usuarioParaSalvar.following},
                posts = ${usuarioParaSalvar.posts},
                biography = ${usuarioParaSalvar.biography},
                is_private = ${usuarioParaSalvar.isPrivate},
                is_verified = ${usuarioParaSalvar.isVerified},
                added_at = NOW() 
            WHERE grupo_id = ${realGroupId} AND username = ${cleanUsername}
        `
    } else {
        // --- CENÁRIO B: NÃO EXISTE (INSERIR) ---
        console.log('✨ Inserindo novo membro...')
        await sql`
            INSERT INTO grupo_membros (
                grupo_id, username, full_name, profile_pic, followers, 
                following, posts, biography, is_private, is_verified, added_at
            )
            VALUES (
                ${realGroupId},
                ${usuarioParaSalvar.username},
                ${usuarioParaSalvar.fullName},
                ${usuarioParaSalvar.profilePic},
                ${usuarioParaSalvar.followers},
                ${usuarioParaSalvar.following},
                ${usuarioParaSalvar.posts},
                ${usuarioParaSalvar.biography},
                ${usuarioParaSalvar.isPrivate},
                ${usuarioParaSalvar.isVerified},
                NOW()
            )
        `
    }

    // 4️⃣ GARANTIR NA TABELA GERAL DE USUÁRIOS (Sincronia)
    const userCheck = await sql`SELECT username FROM usuarios WHERE username = ${cleanUsername}`
    
    if (userCheck.rows.length > 0) {
        await sql`
            UPDATE usuarios SET
                full_name = ${usuarioParaSalvar.fullName},
                profile_pic = ${usuarioParaSalvar.profilePic},
                followers = ${usuarioParaSalvar.followers},
                following = ${usuarioParaSalvar.following},
                posts = ${usuarioParaSalvar.posts},
                biography = ${usuarioParaSalvar.biography},
                last_login = NOW()
            WHERE username = ${cleanUsername}
        `
    } else {
        await sql`
            INSERT INTO usuarios (
                username, full_name, profile_pic, followers, following, posts, 
                biography, is_verified, is_private, instagram_id, last_login
            ) VALUES (
                ${usuarioParaSalvar.username}, 
                ${usuarioParaSalvar.fullName}, 
                ${usuarioParaSalvar.profilePic}, 
                ${usuarioParaSalvar.followers}, 
                ${usuarioParaSalvar.following}, 
                ${usuarioParaSalvar.posts}, 
                ${usuarioParaSalvar.biography}, 
                ${usuarioParaSalvar.isVerified}, 
                ${usuarioParaSalvar.isPrivate}, 
                ${usuarioParaSalvar.username}, 
                NOW()
            )
        `
    }

    // Atualiza o grupo para aparecer no topo
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`

    console.log('✅ Sucesso Total!')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Erro 500 detalhado:', error)
    return NextResponse.json({ 
        error: error.message || 'Erro interno no banco de dados' 
    }, { status: 500 })
  }
}