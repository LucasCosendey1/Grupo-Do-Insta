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

export const dynamic = 'force-dynamic'
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

  // ── Sondas cruas: status HTTP + início do corpo de cada fonte ───────────────
  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  const buscaHeaders = { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
  const q = `site%3Ainstagram.com+%22${username}%22`
  const sondas: { nome: string; url: string; headers?: Record<string, string> }[] = [
    // Motores de busca
    { nome: 'yahoo', url: `https://search.yahoo.com/search?p=${q}`, headers: buscaHeaders },
    { nome: 'ecosia', url: `https://www.ecosia.org/search?q=${q}`, headers: buscaHeaders },
    { nome: 'mojeek', url: `https://www.mojeek.com/search?q=${q}`, headers: buscaHeaders },
    { nome: 'brave', url: `https://search.brave.com/search?q=${q}`, headers: buscaHeaders },
    {
      nome: 'qwant_api',
      url: `https://api.qwant.com/v3/search/web?q=${q}&count=10&locale=en_US&offset=0&device=desktop`,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    },
    {
      nome: 'bing_com_cookie',
      url: `https://www.bing.com/search?q=${q}`,
      headers: {
        ...buscaHeaders,
        Cookie: 'SRCHHPGUSR=SRCHLANG=en&ADLT=DEMOTE; _EDGE_CD=m=en-us&u=en-us; _EDGE_S=mkt=en-us',
      },
    },
    // Espelhos do Instagram
    { nome: 'picuki', url: `https://www.picuki.com/profile/${username}`, headers: buscaHeaders },
    { nome: 'greatfon', url: `https://greatfon.com/v/${username}`, headers: buscaHeaders },
    { nome: 'imginn', url: `https://imginn.com/${username}/`, headers: buscaHeaders },
    // APIs de estatísticas
    {
      nome: 'instrack',
      url: `https://api.instrack.app/api/account/${username}`,
      headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://instrack.app/' },
    },
  ]

  const probes = []
  for (const s of sondas) {
    const inicio = Date.now()
    try {
      const res = await fetch(s.url, {
        headers: s.headers,
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })
      const ct = res.headers.get('content-type') || ''
      let corpo = ''
      let temFollowers = false
      let temUsername = false
      let excertoFollowers: string | null = null
      try {
        if (ct.startsWith('image/')) {
          corpo = `(imagem, ${(await res.arrayBuffer()).byteLength} bytes)`
        } else {
          const texto = await res.text()
          corpo = texto.substring(0, 200).replace(/\s+/g, ' ')
          const lower = texto.toLowerCase()
          temUsername = lower.includes(username)
          const iF = lower.indexOf('followers') !== -1 ? lower.indexOf('followers') : lower.indexOf('seguidores')
          temFollowers = iF !== -1
          if (iF !== -1) {
            excertoFollowers = texto
              .substring(Math.max(0, iF - 350), iF + 250)
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          }
        }
      } catch {}
      probes.push({
        fonte: s.nome,
        status: res.status,
        contentType: ct,
        ms: Date.now() - inicio,
        temUsername,
        temFollowers,
        excertoFollowers,
        corpo,
      })
    } catch (e) {
      probes.push({
        fonte: s.nome,
        status: null,
        ms: Date.now() - inicio,
        erro: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      })
    }
  }

  return NextResponse.json({
    username,
    ambiente: process.env.VERCEL ? 'vercel' : 'local',
    resultados,
    probes,
  })
}
