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

  // ── Sondas cruas: status HTTP + início do corpo de cada fonte ───────────────
  const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  const sondas: { nome: string; url: string; headers?: Record<string, string> }[] = [
    {
      nome: 'instagram_web_profile_info',
      url: `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      headers: { 'x-ig-app-id': '936619743392459', 'User-Agent': UA },
    },
    {
      nome: 'storiesig',
      url: `https://api-ig.storiesig.info/api/user?username=${username}`,
      headers: { 'User-Agent': UA, Origin: 'https://storiesig.info', Referer: 'https://storiesig.info/' },
    },
    { nome: 'mixerno', url: `https://mixerno.space/api/instagram-user/user/${username}` },
    {
      nome: 'livecounts',
      url: `https://api.livecounts.io/instagram-live-follower-counter/stats/${username}`,
      headers: { 'User-Agent': UA, Origin: 'https://livecounts.io', Referer: 'https://livecounts.io/' },
    },
    {
      nome: 'duckduckgo',
      url: `https://html.duckduckgo.com/html/?q=site%3Ainstagram.com+%22${username}%22`,
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    },
    {
      nome: 'bing',
      url: `https://www.bing.com/search?q=site%3Ainstagram.com+%22${username}%22`,
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    },
    { nome: 'socialcounts', url: `https://api.socialcounts.org/instagram-live-follower-count/${username}` },
    {
      nome: 'searx',
      url: `https://searx.be/search?q=site%3Ainstagram.com+%22${username}%22&format=json`,
      headers: { 'User-Agent': UA },
    },
    { nome: 'unavatar', url: `https://unavatar.io/instagram/${username}?fallback=false` },
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
      try {
        corpo = ct.startsWith('image/')
          ? `(imagem, ${(await res.arrayBuffer()).byteLength} bytes)`
          : (await res.text()).substring(0, 250).replace(/\s+/g, ' ')
      } catch {}
      probes.push({ fonte: s.nome, status: res.status, contentType: ct, ms: Date.now() - inicio, corpo })
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
