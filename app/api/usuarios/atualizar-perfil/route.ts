// app/api/usuarios/atualizar-perfil/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { forceRefreshUser } from '@/lib/sync-instagram-data'

/**
 * POST /api/usuarios/atualizar-perfil
 * 
 * Força atualização dos dados do usuário do Instagram
 * Útil quando o usuário quer atualizar manualmente (botão "Atualizar")
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username não fornecido' },
        { status: 400 }
      )
    }
    
    console.log('🔄 Requisição para atualizar perfil:', username)
    
    // Forçar atualização (buscar do Instagram e salvar no banco)
    const userData = await forceRefreshUser(username)
    
    if (!userData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Não foi possível atualizar os dados. Tente novamente.' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      data: {
        username: userData.username,
        fullName: userData.full_name,
        followers: userData.followers,
        profilePic: userData.profile_pic,
        lastLogin: userData.last_login
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao atualizar perfil. Tente novamente.' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/usuarios/atualizar-perfil?username=xxx
 * 
 * Verifica se usuário precisa de atualização
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    
    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username não fornecido' },
        { status: 400 }
      )
    }
    
    const { needsRefresh, getUserFromDatabase } = await import('@/lib/sync-instagram-data')
    
    const precisa = await needsRefresh(username)
    const userData = await getUserFromDatabase(username)
    
    return NextResponse.json({
      success: true,
      needsRefresh: precisa,
      lastLogin: userData?.last_login,
      data: userData ? {
        username: userData.username,
        fullName: userData.full_name,
        followers: userData.followers,
        profilePic: userData.profile_pic
      } : null
    })
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}