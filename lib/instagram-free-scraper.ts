/**
 * lib/instagram-free-scraper.ts
 *
 * Scraping GRATUITO do Instagram com cadeia de fallbacks.
 * Nenhuma estratégia usa proxy pago, API oficial ou serviço pago.
 *
 * ORDEM DAS ESTRATÉGIAS:
 *  1. web_profile_info (endpoint interno do Instagram) — dados completos.
 *     Funciona em localhost/IP residencial; na Vercel geralmente é bloqueado,
 *     mas custa nada tentar.
 *  2. StoriesIG (api-ig.storiesig.info) — serviço gratuito que proxeia o
 *     Instagram com IPs próprios. Dados completos.
 *  3. Mixerno (mixerno.space) — API pública de contadores. Seguidores em
 *     tempo real (dados parciais).
 *  4. Livecounts (api.livecounts.io) — idem (dados parciais).
 *  5. DuckDuckGo HTML — extrai "X Followers" do snippet da busca
 *     (dados parciais e possivelmente defasados; último recurso).
 *
 * FOTO: quando a fonte não traz foto, usa unavatar.io/instagram/{user}
 * (gratuito) e converte para Base64.
 *
 * Use /api/instagram/testar-metodos?username=xxx em produção para ver
 * qual estratégia funciona no IP da Vercel.
 */

import { fetchImageAsBase64 } from './image-utils'
import type { InstagramProfile } from './instagram-api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ResultadoGratis {
  profile: InstagramProfile
  fonte: string
  parcial: boolean // true = só seguidores/nome/foto (sem bio, posts, following confiáveis)
}

type Estrategia = {
  nome: string
  parcial: boolean
  fn: (username: string) => Promise<InstagramProfile | null>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 8000

function fetchComTimeout(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

/** Converte "271M", "12.3K", "3,540" em número */
export function parseNumeroAbreviado(valor: string): number {
  const t = valor.trim().toUpperCase().replace(/,/g, '')
  const m = t.match(/^([\d.]+)\s*([KMB])?$/)
  if (!m) return 0
  let n = parseFloat(m[1])
  if (m[2] === 'K') n *= 1e3
  if (m[2] === 'M') n *= 1e6
  if (m[2] === 'B') n *= 1e9
  return Math.round(n)
}

/** Busca recursiva por um objeto de usuário em JSON de estrutura desconhecida */
function acharUsuarioNoJSON(obj: unknown, depth = 0): Record<string, any> | null {
  if (depth > 12 || !obj || typeof obj !== 'object') return null
  const o = obj as Record<string, any>
  if (
    o.username &&
    (o.edge_followed_by !== undefined || o.follower_count !== undefined || o.followerCount !== undefined)
  ) {
    return o
  }
  for (const key of Object.keys(o)) {
    const achado = acharUsuarioNoJSON(o[key], depth + 1)
    if (achado) return achado
  }
  return null
}

function montarPerfilCompleto(username: string, user: Record<string, any>): InstagramProfile {
  return {
    username: user.username || username,
    fullName: user.full_name || user.fullName || username,
    biography: user.biography || '',
    followers: user.edge_followed_by?.count ?? user.follower_count ?? user.followerCount ?? 0,
    following: user.edge_follow?.count ?? user.following_count ?? user.followingCount ?? 0,
    posts: user.edge_owner_to_timeline_media?.count ?? user.media_count ?? user.mediaCount ?? 0,
    isPrivate: user.is_private ?? user.isPrivate ?? false,
    isVerified: user.is_verified ?? user.isVerified ?? false,
    instagramId: String(user.id || user.pk || username),
    profilePic:
      user.profile_pic_url_hd ||
      user.profile_pic_url ||
      user.hd_profile_pic_url_info?.url ||
      '',
  }
}

function perfilParcial(username: string, followers: number, extras: Partial<InstagramProfile> = {}): InstagramProfile {
  return {
    username,
    fullName: extras.fullName || username,
    biography: '',
    followers,
    following: extras.following ?? 0,
    posts: extras.posts ?? 0,
    isPrivate: false,
    isVerified: false,
    instagramId: username,
    profilePic: '',
    ...extras,
  }
}

// ─── Estratégia 1: web_profile_info (Instagram interno) ──────────────────────

async function viaWebProfileInfo(username: string): Promise<InstagramProfile | null> {
  const tentativas: { url: string; headers: Record<string, string> }[] = [
    {
      url: `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      headers: {
        'x-ig-app-id': '936619743392459',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `https://www.instagram.com/${username}/`,
      },
    },
    {
      url: `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      headers: {
        'x-ig-app-id': '936619743392459',
        'User-Agent':
          'Instagram 275.0.0.27.98 (iPhone13,2; iOS 16_3; en_US; en-US; scale=3.00; 1170x2532; 458229237)',
        Accept: '*/*',
      },
    },
  ]

  for (const t of tentativas) {
    try {
      const res = await fetchComTimeout(t.url, { headers: t.headers })
      if (!res.ok) continue
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('json')) continue // login wall devolve HTML
      const json = await res.json()
      const user = json?.data?.user
      if (user?.username) return montarPerfilCompleto(username, user)
    } catch {
      continue
    }
  }
  return null
}

// ─── Estratégia 2: StoriesIG ──────────────────────────────────────────────────

async function viaStoriesIG(username: string): Promise<InstagramProfile | null> {
  const res = await fetchComTimeout(
    `https://api-ig.storiesig.info/api/user?username=${encodeURIComponent(username)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Origin: 'https://storiesig.info',
        Referer: 'https://storiesig.info/',
      },
    }
  )
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  if (!json) return null
  const user = acharUsuarioNoJSON(json)
  if (!user) return null
  return montarPerfilCompleto(username, user)
}

// ─── Estratégia 3: Mixerno ────────────────────────────────────────────────────

async function viaMixerno(username: string): Promise<InstagramProfile | null> {
  const res = await fetchComTimeout(
    `https://mixerno.space/api/instagram-user/user/${encodeURIComponent(username)}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  if (!json) return null

  // Estruturas possíveis: { counts: [{ value }] } ou campos diretos
  const followers =
    json?.counts?.[0]?.value ??
    json?.followerCount ??
    json?.follower_count ??
    json?.stats?.followerCount ??
    null

  if (typeof followers !== 'number' || followers <= 0) return null

  const nome = json?.user?.name || json?.user?.full_name || json?.username || username
  return perfilParcial(username, followers, { fullName: nome })
}

// ─── Estratégia 4: Livecounts ─────────────────────────────────────────────────

async function viaLivecounts(username: string): Promise<InstagramProfile | null> {
  const res = await fetchComTimeout(
    `https://api.livecounts.io/instagram-live-follower-counter/stats/${encodeURIComponent(username)}`,
    {
      headers: {
        Accept: 'application/json',
        Origin: 'https://livecounts.io',
        Referer: 'https://livecounts.io/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    }
  )
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  const followers = json?.followerCount ?? json?.follower_count ?? null
  if (typeof followers !== 'number' || followers <= 0) return null

  // bottomOdos costuma ser [following, posts]
  const extras: Partial<InstagramProfile> = {}
  if (Array.isArray(json?.bottomOdos)) {
    extras.following = Number(json.bottomOdos[0]) || 0
    extras.posts = Number(json.bottomOdos[1]) || 0
  }
  return perfilParcial(username, followers, extras)
}

// ─── Estratégia 5: DuckDuckGo (snippet da busca) ──────────────────────────────

async function viaDuckDuckGo(username: string): Promise<InstagramProfile | null> {
  const q = encodeURIComponent(`site:instagram.com "${username}"`)
  const res = await fetchComTimeout(`https://html.duckduckgo.com/html/?q=${q}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!res.ok) return null
  const html = await res.text()

  // Achar o trecho do resultado que aponta para instagram.com/{username}
  const idx = html.toLowerCase().indexOf(`instagram.com%2f${username.toLowerCase()}`) !== -1
    ? html.toLowerCase().indexOf(`instagram.com%2f${username.toLowerCase()}`)
    : html.toLowerCase().indexOf(`instagram.com/${username.toLowerCase()}`)
  if (idx === -1) return null

  const trecho = html.substring(Math.max(0, idx - 300), idx + 1200)

  // "271M Followers, 590 Following, 3,542 Posts"
  const mFollowers = trecho.match(/([\d][\d.,]*\s?[KMB]?)\s*Followers/i)
  if (!mFollowers) return null
  const followers = parseNumeroAbreviado(mFollowers[1])
  if (followers <= 0) return null

  const extras: Partial<InstagramProfile> = {}
  const mFollowing = trecho.match(/([\d][\d.,]*\s?[KMB]?)\s*Following/i)
  const mPosts = trecho.match(/([\d][\d.,]*\s?[KMB]?)\s*Posts/i)
  if (mFollowing) extras.following = parseNumeroAbreviado(mFollowing[1])
  if (mPosts) extras.posts = parseNumeroAbreviado(mPosts[1])

  // Nome: "Nome Completo (@username)"
  const mNome = trecho.match(new RegExp(`>([^<>]{2,80})\\s*\\(@${username}\\)`, 'i'))
  if (mNome) extras.fullName = mNome[1].trim()

  return perfilParcial(username, followers, extras)
}

// ─── Foto de perfil gratuita (unavatar.io) ────────────────────────────────────

export async function buscarFotoGratis(username: string): Promise<string | null> {
  try {
    return await fetchImageAsBase64(
      `https://unavatar.io/instagram/${encodeURIComponent(username)}?fallback=false`
    )
  } catch {
    return null
  }
}

// ─── Lista de estratégias (exportada p/ rota de debug) ───────────────────────

export const ESTRATEGIAS: Estrategia[] = [
  { nome: 'instagram_web_profile_info', parcial: false, fn: viaWebProfileInfo },
  { nome: 'storiesig',                  parcial: false, fn: viaStoriesIG },
  { nome: 'mixerno',                    parcial: true,  fn: viaMixerno },
  { nome: 'livecounts',                 parcial: true,  fn: viaLivecounts },
  { nome: 'duckduckgo',                 parcial: true,  fn: viaDuckDuckGo },
]

// ─── Função principal ─────────────────────────────────────────────────────────

export async function getProfileGratis(username: string): Promise<ResultadoGratis | null> {
  const clean = username.replace('@', '').trim().toLowerCase()
  if (!clean) return null

  for (const estrategia of ESTRATEGIAS) {
    try {
      console.log(`🆓 [FREE] Tentando: ${estrategia.nome}...`)
      const profile = await estrategia.fn(clean)

      if (profile && profile.followers >= 0 && profile.username) {
        console.log(`✅ [FREE] ${estrategia.nome} funcionou! ${profile.followers} seguidores`)

        // Converter foto para Base64 (ou buscar no unavatar se não veio)
        if (profile.profilePic && !profile.profilePic.startsWith('data:')) {
          profile.profilePic = (await fetchImageAsBase64(profile.profilePic)) || ''
        }
        if (!profile.profilePic) {
          profile.profilePic = (await buscarFotoGratis(clean)) || ''
        }

        return { profile, fonte: estrategia.nome, parcial: estrategia.parcial }
      }
      console.log(`⚠️ [FREE] ${estrategia.nome} não retornou dados válidos`)
    } catch (e) {
      console.log(`❌ [FREE] ${estrategia.nome} falhou:`, e instanceof Error ? e.message : e)
    }
  }

  console.log('❌ [FREE] Todas as estratégias gratuitas falharam')
  return null
}
