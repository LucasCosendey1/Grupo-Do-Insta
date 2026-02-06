// app/api/cron/atualizar-usuarios/route.js
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

// 🔥 Força a rota a ser dinâmica para não fazer cache
export const dynamic = 'force-dynamic'
// 🔥 Tenta estender o tempo limite (funciona no plano Pro, no Hobby é ignorado mas não custa tentar)
export const maxDuration = 60; 

export async function GET(request) {
  // REMOVI O BLOQUEIO DE PRODUÇÃO AQUI. AGORA ELE VAI RODAR.

  console.log('🏁 INICIANDO CRON JOB...')

  try {
    // 1️⃣ SELEÇÃO MAIS CONSERVADORA
    // Mudamos LIMIT 5 para LIMIT 2 para evitar TIMEOUT da Vercel (10s limite)
    const usuariosResult = await sql`
      SELECT username FROM usuarios 
      WHERE updated_at IS NULL 
         OR updated_at < NOW() - INTERVAL '3 days'
      ORDER BY updated_at ASC NULLS FIRST
      LIMIT 2
    `

    const totalUsuarios = usuariosResult.rows.length
    
    if (totalUsuarios === 0) {
      console.log('✅ Todos os usuários estão atualizados.')
      return NextResponse.json({ message: 'Nada para atualizar', updated: 0 })
    }

    console.log(`📋 ${totalUsuarios} usuários na fila para atualizar...`)

    let atualizados = 0
    let erros = 0
    const resultados = []

    for (const usuario of usuariosResult.rows) {
      const username = usuario.username
      
      try {
        console.log(`🔄 Atualizando @${username}...`)
        
        // Delay menor (1s a 3s) para economizar tempo de execução da Vercel
        const delay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000)
        await new Promise(r => setTimeout(r, delay)) 

        const data = await scrapeInstagramProfile(username)
        
        // 2️⃣ VALIDAÇÃO BLINDADA (Igual usamos na criação de grupo)
        // Só atualiza se tiver seguidores OU se a foto não for o avatar padrão
        const isValid = data && (
            data.followers > 0 || 
            (data.profilePic && !data.profilePic.includes('ui-avatars'))
        );

        if (isValid) {
          // Atualiza Tabela de Usuários
          await sql`
            UPDATE usuarios SET
              full_name = ${data.fullName},
              profile_pic = ${data.profilePic},
              followers = ${data.followers},
              following = ${data.following},
              posts = ${data.posts},
              biography = ${data.biography},
              updated_at = NOW()
            WHERE username = ${username}
          `
          
          // Atualiza os membros dentro dos grupos (para a foto mudar lá também)
          await sql`
            UPDATE grupo_membros SET 
              profile_pic = ${data.profilePic},
              followers = ${data.followers}
            WHERE username = ${username}
          `
          
          console.log(`   ✅ Sucesso!`)
          atualizados++
          resultados.push({ username, status: 'updated' })
        } else {
          console.log(`   ⚠️ Falha/Bloqueio. Mantendo dados antigos.`)
          
          // 3️⃣ ESTRATÉGIA DE BACKOFF
          // Se falhou, atualizamos o 'updated_at' para AGORA.
          // Isso joga o usuário para o final da fila. 
          // Se não fizermos isso, o Cron vai tentar o mesmo usuário falho a cada minuto.
          await sql`UPDATE usuarios SET updated_at = NOW() WHERE username = ${username}`
          
          erros++
          resultados.push({ username, status: 'skipped_block' })
        }

      } catch (error) {
        console.error(`   ❌ Erro processando ${username}:`, error.message)
        // Joga pro final da fila também em caso de erro
        await sql`UPDATE usuarios SET updated_at = NOW() WHERE username = ${username}`
        resultados.push({ username, error: error.message })
        erros++
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: atualizados, 
      skipped: erros,
      details: resultados 
    })

  } catch (error) {
    console.error('❌ ERRO GERAL NO CRON:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}