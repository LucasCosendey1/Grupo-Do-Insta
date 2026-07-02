/**
 * app/api/scrape/route.ts
 *
 * GET /api/scrape?username=xxx
 *
 * Rota usada pelo cron (atualizar-usuarios). Retorna o perfil no formato
 * "flat" que o cron espera. Usa a cadeia gratuita + RapidAPI como fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getInstagramProfile } from '@/lib/instagram-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.replace('@', '').trim().toLowerCase()

  if (!username) {
    return NextResponse.json({ error: 'username é obrigatório' }, { status: 400 })
  }

  const profile = await getInstagramProfile(username)

  if (!profile) {
    return NextResponse.json(
      { error: `Não foi possível obter dados de @${username}` },
      { status: 404 }
    )
  }

  return NextResponse.json(profile)
}
