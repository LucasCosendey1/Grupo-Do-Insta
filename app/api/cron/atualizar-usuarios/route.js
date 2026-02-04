
// app/api/cron/atualizar-usuarios/route.js
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

// Força que a rota seja dinâmica para não cachear resultados antigos
export const dynamic = 'force-dynamic'

export async function GET(request) {
  // 🔒 SEGURANÇA: (Opcional) Verifique se a chamada vem do Vercel Cron
  // const authHeader = request.headers.get('authorization')
  // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  // }

  console.log('🏁 INICIANDO CRON (MODO INTELIGENTE)...')

  try {
    // 🧠 A LÓGICA INTELIGENTE:
    // 1. Pega quem tem updated_at NULL (novos usuários)
    // 2. OU quem foi atualizado há mais de 24 horas
    // 3. Ordena pelos mais antigos primeiro (ASC)
    // 4. Limita a 5 por execução (Segurança contra bloqueio)
    
    const usuariosResult = await sql`
      SELECT username FROM usuarios 
      WHERE updated_at IS NULL 
         OR updated_at < NOW() - INTERVAL '24 hours'
      ORDER BY updated_at ASC NULLS FIRST
      LIMIT 5
    `

    const totalUsuarios = usuariosResult.rows.length
    
    if (totalUsuarios === 0) {
      console.log('✅ Tudo em dia! Ninguém para atualizar.')
      return NextResponse.json({ message: 'Todos os usuários estão atualizados.', updated: 0 })
    }

    console.log(`📋 Fila Inteligente: ${totalUsuarios} usuários para atualizar...`)

    let atualizados = 0
    let erros = 0
    const resultados = []

    for (const usuario of usuariosResult.rows) {
      const username = usuario.username
      
      try {
        console.log(`🔄 Atualizando @${username}...`)
        
        // Delay aleatório entre 2s e 5s para parecer humano
        const delay = Math.floor(Math.random() * (5000 - 2000 + 1) + 2000)
        await new Promise(r => setTimeout(r, delay)) 

        const data = await scrapeInstagramProfile(username)
        
        if (data) {
          // Atualiza Tabela Mestra
          await sql`
            UPDATE usuarios SET
              full_name = ${data.fullName},
              profile_pic = ${data.profilePic},
              followers = ${data.followers},
              posts = ${data.posts},
              updated_at = NOW()
            WHERE username = ${username}
          `
           // Atualiza Grupos (Réplica)
          await sql`
            UPDATE grupo_membros SET profile_pic = ${data.profilePic}
            WHERE username = ${username}
          `
          console.log(`   ✅ Sucesso!`)
          atualizados++
          resultados.push({ username, status: 'ok' })
        } else {
            console.log(`   ⚠️ Falha (Scraper retornou null)`)
            // ESTRATÉGIA ANTI-TRAVAMENTO:
            // Se falhar, atualiza a data para "agora" mesmo sem dados.
            // Isso joga o usuário pro fim da fila e evita que o Cron
            // fique tentando atualizar o mesmo perfil bugado infinitamente.
            await sql`UPDATE usuarios SET updated_at = NOW() WHERE username = ${username}`
            
            erros++
            resultados.push({ username, status: 'skipped_error' })
        }

      } catch (error) {
        console.error(`   ❌ Erro Crítico em @${username}:`, error.message)
        // Joga pro fim da fila também em caso de erro de conexão
        await sql`UPDATE usuarios SET updated_at = NOW() WHERE username = ${username}`
        resultados.push({ username, error: error.message })
        erros++
      }
    }

    return NextResponse.json({ 
      success: true, 
      updated: atualizados, 
      errors: erros,
      details: resultados 
    })

  } catch (error) {
    console.error('❌ ERRO GERAL NO CRON:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}