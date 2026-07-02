/**
 * lib/instagram-api.ts
 *
 * Integração com a RapidAPI - Instagram Profile1
 * Endpoint: GET https://instagram-profile1.p.rapidapi.com/getprofile/{username}
 */

import { fetchImageAsBase64 } from './image-utils'
import { getProfileGratis } from './instagram-free-scraper'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface InstagramProfile {
  username: string
  fullName: string
  profilePic: string
  biography: string
  followers: number
  following: number
  posts: number
  isPrivate: boolean
  isVerified: boolean
  instagramId: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY!
const RAPIDAPI_HOST = 'instagram-profile1.p.rapidapi.com'
const BASE_URL      = `https://${RAPIDAPI_HOST}/getprofile`

// ─── Função principal ─────────────────────────────────────────────────────────
// 1º tenta a cadeia GRATUITA (lib/instagram-free-scraper.ts)
// 2º cai na RapidAPI apenas como último recurso

export async function getInstagramProfile(username: string): Promise<InstagramProfile | null> {
  const clean = username.replace('@', '').trim().toLowerCase()
  if (!clean) return null

  // ── Cadeia gratuita primeiro ────────────────────────────────────────────────
  const gratis = await getProfileGratis(clean)
  if (gratis) {
    console.log(`🎉 [FREE] Perfil obtido via "${gratis.fonte}" (parcial: ${gratis.parcial})`)
    return gratis.profile
  }

  // ── Último recurso: RapidAPI ────────────────────────────────────────────────
  return getProfileViaRapidApi(clean)
}

// ─── RapidAPI (fallback pago/free-tier) ───────────────────────────────────────

async function getProfileViaRapidApi(clean: string): Promise<InstagramProfile | null> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📸 [RAPIDAPI] Buscando perfil: @${clean}`)

  if (!RAPIDAPI_KEY) {
    console.error('❌ [RAPIDAPI] RAPIDAPI_KEY não configurada no .env.local!')
    return null
  }

  try {
    const url = `${BASE_URL}/${encodeURIComponent(clean)}`
    console.log(`🌐 [RAPIDAPI] URL: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key':  RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      cache: 'no-store',
    })

    console.log(`📡 [RAPIDAPI] Status HTTP: ${response.status}`)

    if (!response.ok) {
      console.error(`❌ [RAPIDAPI] Erro HTTP ${response.status}`)
      return null
    }

    const raw = await response.json()
    console.log('🔍 [RAPIDAPI] Resposta bruta:')
    console.log(JSON.stringify(raw, null, 2))

    // ── Checar se a API retornou erro explícito ───────────────────────────────
    if (raw?.error === true || raw?.not_found === true) {
      console.log(`❌ [RAPIDAPI] API retornou erro: ${raw?.message || 'não encontrado'}`)
      return null
    }

    // ── Encontrar objeto do usuário (diferentes estruturas possíveis) ─────────
    const user = raw?.data?.user ?? raw?.user ?? raw

    if (!user?.username) {
      console.error('❌ [RAPIDAPI] Estrutura inesperada — sem campo username')
      console.error('Chaves disponíveis:', Object.keys(raw))
      return null
    }

    console.log(`✅ [RAPIDAPI] Perfil encontrado: @${user.username}`)
    console.log(`   Nome:       ${user.full_name}`)
    console.log(`   Seguidores: ${user.edge_followed_by?.count ?? user.follower_count ?? 0}`)
    console.log(`   Posts:      ${user.edge_owner_to_timeline_media?.count ?? user.media_count ?? 0}`)
    console.log(`   Privado:    ${user.is_private ? 'Sim' : 'Não'}`)
    console.log(`   Verificado: ${user.is_verified ? 'Sim' : 'Não'}`)

    // ── Converter foto para Base64 ────────────────────────────────────────────
    const picUrl =
      user.profile_pic_url_hd              ||
      user.profile_pic_url                 ||
      user.hd_profile_pic_url_info?.url    ||
      user.profile_pic                     ||
      ''

    console.log(`🖼️  [RAPIDAPI] URL da foto: ${picUrl ? picUrl.substring(0, 60) + '...' : 'NENHUMA'}`)

    const profilePicBase64 = picUrl ? await fetchImageAsBase64(picUrl) : null

    // ── Montar perfil padronizado ─────────────────────────────────────────────
    const profile: InstagramProfile = {
      username:    user.username,
      fullName:    user.full_name    || user.username,
      biography:   user.biography    || '',
      followers:   user.edge_followed_by?.count              ?? user.follower_count  ?? 0,
      following:   user.edge_follow?.count                   ?? user.following_count ?? 0,
      posts:       user.edge_owner_to_timeline_media?.count  ?? user.media_count     ?? 0,
      isPrivate:   user.is_private  ?? false,
      isVerified:  user.is_verified ?? false,
      instagramId: user.id || user.pk || user.username,
      profilePic:  profilePicBase64 || '',
    }

    console.log(`🎉 [RAPIDAPI] Perfil processado com sucesso!`)
    console.log(`   Foto Base64: ${profilePicBase64 ? `${(profilePicBase64.length / 1024).toFixed(1)}KB` : 'SEM FOTO'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return profile

  } catch (error) {
    console.error('❌ [RAPIDAPI] Erro inesperado:', error)
    return null
  }
}