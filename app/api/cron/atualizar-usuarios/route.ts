// app/api/cron/atualizar-usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

/**
 * 🕐 CRON JOB: Atualizar todos os usuários
 * * Roda automaticamente TODO DIA às 3h da manhã (horário de Brasília)
 */


// ⚠️ SEGURANÇA: Só permite chamadas do Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verificar se é uma chamada legítima do Vercel Cron
    const authHeader = request.headers.get('authorization')
    
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Tentativa não autorizada de executar cron job')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🕐 CRON JOB INICIADO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⏰ Horário:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    console.log('')

    // 1️⃣ BUSCAR TODOS OS USUÁRIOS
    console.log('📋 Buscando usuários...')
    const usuariosResult = await sql`
      SELECT username, last_login 
      FROM usuarios 
      ORDER BY last_login DESC
    `

    const totalUsuarios = usuariosResult.rows.length
    console.log(`✅ Encontrados ${totalUsuarios} usuários`)
    console.log('')

    if (totalUsuarios === 0) {
      console.log('⚠️  Nenhum usuário para atualizar')
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário para atualizar',
        updated: 0
      })
    }

    // 2️⃣ ATUALIZAR CADA USUÁRIO
    console.log('🔄 Iniciando atualização...')
    console.log('')

    let atualizados = 0
    let erros = 0
    const resultados = []

    for (const [index, usuario] of usuariosResult.rows.entries()) {
      const username = usuario.username
      
      try {
        console.log(`[${index + 1}/${totalUsuarios}] Atualizando @${username}...`)

        // Buscar dados do Instagram
        const baseUrl = getBaseUrl(request)
        const scrapeResponse = await fetch(`${baseUrl}/api/scrape?username=${username}`)
        
        if (!scrapeResponse.ok) {
          throw new Error(`Scrape falhou: ${scrapeResponse.status}`)
        }

        const instagramData = await scrapeResponse.json()

        // Atualizar no banco (tabela usuarios)
        await sql`
          UPDATE usuarios SET
            full_name = ${instagramData.fullName || username},
            profile_pic = COALESCE(NULLIF(${instagramData.profilePic || ''}, ''), profile_pic),
            followers = ${instagramData.followers || 0},
            following = CASE WHEN ${instagramData.following || 0} = 0 THEN following ELSE ${instagramData.following || 0} END,
            posts = CASE WHEN ${instagramData.posts || 0} = 0 THEN posts ELSE ${instagramData.posts || 0} END,
            biography = COALESCE(NULLIF(${instagramData.biography || ''}, ''), biography),
            is_verified = ${instagramData.isVerified || false},
            is_private = ${instagramData.isPrivate || false},
            last_login = NOW()
          WHERE username = ${username}
        `

        // Atualizar nos grupos (tabela grupo_membros)
        await sql`
          UPDATE grupo_membros SET
            full_name = ${instagramData.fullName || username},
            profile_pic = COALESCE(NULLIF(${instagramData.profilePic || ''}, ''), profile_pic),
            followers = ${instagramData.followers || 0},
            following = CASE WHEN ${instagramData.following || 0} = 0 THEN following ELSE ${instagramData.following || 0} END,
            posts = CASE WHEN ${instagramData.posts || 0} = 0 THEN posts ELSE ${instagramData.posts || 0} END,
            biography = COALESCE(NULLIF(${instagramData.biography || ''}, ''), biography),
            is_verified = ${instagramData.isVerified || false},
            is_private = ${instagramData.isPrivate || false}
          WHERE username = ${username}
        `

        console.log(`   ✅ @${username} - ${instagramData.followers} seguidores`)
        
        atualizados++
        resultados.push({
          username,
          success: true,
          followers: instagramData.followers
        })

        // Delay de 2 segundos entre requisições (evitar rate limit)
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        // ✅ CORREÇÃO 1: Tratamento de erro dentro do loop
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error(`   ❌ @${username} - Erro: ${errorMessage}`)
        
        erros++
        resultados.push({
          username,
          sucesso: false,
          erro: errorMessage
        })
      }
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 RESUMO DA ATUALIZAÇÃO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Total de usuários: ${totalUsuarios}`)
    console.log(`✅ Atualizados: ${atualizados}`)
    console.log(`❌ Erros: ${erros}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    return NextResponse.json({
      success: true,
      message: 'Atualização concluída',
      total: totalUsuarios,
      updated: atualizados,
      errors: erros,
      results: resultados,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NO CRON JOB')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error)

    // ✅ CORREÇÃO 2: O erro principal que impedia o build
    // TypeScript não sabia se 'error' tinha a propriedade .message
    const errorMessage = error instanceof Error ? error.message : 'Erro interno desconhecido'

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  
  if (host) {
    return `${protocol}://${host}`
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  return 'http://localhost:3000'
}
