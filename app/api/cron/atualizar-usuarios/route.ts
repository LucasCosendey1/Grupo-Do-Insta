// app/api/cron/atualizar-usuarios/route.js
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { scrapeInstagramProfile } from '@/lib/instagram-service'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  console.log('🏁 INICIANDO CRON (MODO VIP)...')

  try {
    // 🔥 FORÇA BRUTA: Seleciona APENAS estes usuários, ignorando datas
    const usuariosResult = await sql`
      SELECT username FROM usuarios 
      WHERE username IN (
        'laramlobo', 
        'igorjamal', 
        'p.jeronimoo', 
        'erikagalizafisioterapia', 
        'mattos.lele', 
        'doutor.palestras', 
        'fladaveiga'
      )
    `

    // Se quiser voltar ao normal depois, é só comentar o bloco acima 
    // e descomentar o bloco original que busca por data.

    const totalUsuarios = usuariosResult.rows.length
    console.log(`📋 Atualizando Lista VIP: ${totalUsuarios} usuários...`)

    let atualizados = 0
    const resultados = []

    for (const usuario of usuariosResult.rows) {
      const username = usuario.username
      try {
        console.log(`🔄 Atualizando @${username}...`)
        
        // Delay maior para evitar bloqueio em lista específica
        await new Promise(r => setTimeout(r, 3000)) 

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
           // Atualiza Grupos
          await sql`
            UPDATE grupo_membros SET profile_pic = ${data.profilePic}
            WHERE username = ${username}
          `
          console.log(`   ✅ Sucesso!`)
          atualizados++
          resultados.push({ username, status: 'ok' })
        } else {
            console.log(`   ❌ Falha (Scraper retornou null)`)
            resultados.push({ username, status: 'fail' })
        }

      } catch (error) {
        console.error(`   ❌ Erro em @${username}:`, error.message)
        resultados.push({ username, error: error.message })
      }
    }

    return NextResponse.json({ success: true, updated: atualizados, details: resultados })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}