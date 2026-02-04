// app/api/grupos/adicionar-membro/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { groupId, username, profileData } = await request.json()
    
    // 1. Validação de Entrada
    if (!groupId || !username) {
        return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()
    console.log(`➕ [API] Processando entrada: ${cleanUsername} -> ${groupId}`)

    // 2. Validação do Grupo
    const grupoCheck = await sql`SELECT id FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1`
    if (grupoCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }
    const realGroupId = grupoCheck.rows[0].id

    // 3. Preparação dos Dados (Blindagem)
    let finalData = profileData || {}
    
    // Tenta enriquecer se os dados estiverem pobres
    // Envolvemos em try/catch para que falhas de rede no Instagram NÃO impeçam a entrada no grupo
    if (!finalData.profilePic || !finalData.followers) {
        try {
            console.log('🔍 Buscando dados no Instagram...')
            const scraped = await scrapeInstagramProfile(cleanUsername)
            if (scraped) {
                finalData = { ...finalData, ...scraped }
            } else {
                 // Fallback: Banco de Dados Local
                 const dbUser = await sql`SELECT * FROM usuarios WHERE username = ${cleanUsername}`
                 if (dbUser.rows.length > 0) {
                     const u = dbUser.rows[0]
                     finalData = { 
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
        } catch (scrapeError) {
            console.warn('⚠️ Erro ao raspar dados (ignorando para permitir entrada):', scrapeError)
            // Não faz nada, segue com o que tem para garantir que o usuário entre
        }
    }

    // Garante Avatar (UI Avatars se falhar tudo)
    let safePic = String(finalData.profilePic || '')
    if (safePic.length < 5 || safePic === 'undefined' || safePic === 'null') {
        safePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanUsername)}&size=200&background=00bfff&color=fff&bold=true`
    }

    // Sanitização de Tipos (Evita erro de SQL por tipo inválido)
    const safeUser = {
        username: cleanUsername,
        fullName: String(finalData.fullName || cleanUsername).substring(0, 100),
        profilePic: safePic,
        followers: Number(finalData.followers) || 0,
        following: Number(finalData.following) || 0,
        posts: Number(finalData.posts) || 0,
        biography: String(finalData.biography || '').substring(0, 500),
        isVerified: Boolean(finalData.isVerified),
        isPrivate: Boolean(finalData.isPrivate)
    }

    // 4. OPERAÇÃO SEGURA: Verifica -> Atualiza ou Insere
    // Usamos LOWER() para garantir que não haja duplicidade de Case Sensitive
    const existingMember = await sql`
        SELECT id FROM grupo_membros 
        WHERE grupo_id = ${realGroupId} AND LOWER(username) = ${cleanUsername}
    `

    if (existingMember.rows.length > 0) {
        console.log('🔄 Usuário já existe no grupo. Atualizando dados...')
        await sql`
            UPDATE grupo_membros SET
                full_name = ${safeUser.fullName},
                profile_pic = ${safeUser.profilePic},
                followers = ${safeUser.followers},
                following = ${safeUser.following},
                posts = ${safeUser.posts},
                biography = ${safeUser.biography},
                is_verified = ${safeUser.isVerified},
                is_private = ${safeUser.isPrivate},
                added_at = NOW() -- Traz para o topo
            WHERE grupo_id = ${realGroupId} AND LOWER(username) = ${cleanUsername}
        `
    } else {
        console.log('✨ Inserindo novo membro...')
        await sql`
            INSERT INTO grupo_membros (
                grupo_id, username, full_name, profile_pic, followers, 
                following, posts, biography, is_private, is_verified, added_at
            )
            VALUES (
                ${realGroupId}, ${safeUser.username}, ${safeUser.fullName}, ${safeUser.profilePic}, 
                ${safeUser.followers}, ${safeUser.following}, ${safeUser.posts}, 
                ${safeUser.biography}, ${safeUser.isPrivate}, ${safeUser.isVerified}, NOW()
            )
        `
    }

    // 5. Sincronia Global (Opcional, mas mantém a consistência)
    // Envolvemos em try/catch silencioso pois isso não deve bloquear a entrada no grupo se falhar
    try {
        const globalCheck = await sql`SELECT username FROM usuarios WHERE username = ${cleanUsername}`
        if (globalCheck.rows.length > 0) {
            await sql`
                UPDATE usuarios SET 
                    full_name=${safeUser.fullName}, profile_pic=${safeUser.profilePic}, 
                    followers=${safeUser.followers}, following=${safeUser.following}, 
                    posts=${safeUser.posts}, biography=${safeUser.biography}, last_login=NOW() 
                WHERE username=${cleanUsername}
            `
        } else {
            await sql`
                INSERT INTO usuarios (
                    username, full_name, profile_pic, followers, following, posts, 
                    biography, is_verified, is_private, instagram_id, last_login
                ) VALUES (
                    ${safeUser.username}, ${safeUser.fullName}, ${safeUser.profilePic}, 
                    ${safeUser.followers}, ${safeUser.following}, ${safeUser.posts}, 
                    ${safeUser.biography}, ${safeUser.isVerified}, ${safeUser.isPrivate}, 
                    ${safeUser.username}, NOW()
                )
            `
        }
    } catch (errSync) {
        console.warn('⚠️ Erro não-fatal na sincronia global:', errSync)
    }

    // Atualiza timestamp do grupo para ordenação
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO POST:', error)
    // Retornamos 500, mas com JSON claro
    return NextResponse.json({ error: error.message || 'Erro interno ao entrar no grupo' }, { status: 500 })
  }
}