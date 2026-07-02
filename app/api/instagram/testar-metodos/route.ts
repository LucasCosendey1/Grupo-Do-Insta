/**
 * app/api/instagram/testar-metodos/route.ts
 *
 * 🧪 ROTA DE DEBUG — testa cada estratégia gratuita separadamente.
 *
 * GET /api/instagram/testar-metodos?username=cristiano
 *
 * Faça o deploy e chame essa rota EM PRODUÇÃO para descobrir quais
 * estratégias funcionam a partir do IP da Vercel. Em localhost quase
 * todas funcionam; o que importa é o resultado em produção.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ESTRATEGIAS, buscarFotoGratis } from '@/lib/instagram-free-scraper'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username =
    searchParams.get('username')?.replace('@', '').trim().toLowerCase() || 'instagram'

  const resultados = []

  for (const estrategia of ESTRATEGIAS) {
    const inicio = Date.now()
    try {
      const profile = await estrategia.fn(username)
      resultados.push({
        estrategia: estrategia.nome,
        funcionou: !!profile && profile.followers > 0,
        parcial: estrategia.parcial,
        ms: Date.now() - inicio,
        dados: profile
          ? {
              username: profile.username,
              fullName: profile.fullName,
              followers: profile.followers,
              following: profile.following,
              posts: profile.posts,
              temFoto: !!profile.profilePic,
            }
          : null,
      })
    } catch (e) {
      resultados.push({
        estrategia: estrategia.nome,
        funcionou: false,
        parcial: estrategia.parcial,
        ms: Date.now() - inicio,
        erro: e instanceof Error ? e.message : String(e),
      })
    }
  }

  // Testar foto via unavatar
  const inicioFoto = Date.now()
  const foto = await buscarFotoGratis(username)
  resultados.push({
    estrategia: 'unavatar_foto',
    funcionou: !!foto,
    parcial: true,
    ms: Date.now() - inicioFoto,
    dados: foto ? { tamanhoKB: Math.round(foto.length / 1024) } : null,
  })

  return NextResponse.json({
    username,
    ambiente: process.env.VERCEL ? 'vercel' : 'local',
    resultados,
  })
}
