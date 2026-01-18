// app/api/usuarios/sincronizar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { syncInstagramUserData, InstagramUserData } from '@/lib/sync-instagram-data'

/**
 * POST /api/usuarios/sincronizar
 * 
 * Sincroniza dados do Instagram com PostgreSQL
 * Chamado automaticamente no login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar campos obrigatórios
    if (!body.username) {
      return NextResponse.json(
        { success: false, error: 'Username é obrigatório' },
        { status: 400 }
      )
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 SINCRONIZAR USUÁRIO NO LOGIN')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Username:', body.username)
    console.log('Nome:', body.fullName)
    console.log('Seguidores:', body.followers)
    console.log('Foto:', body.profilePic ? 'SIM ✅' : 'NÃO ❌')
    console.log('')
    
    // Preparar dados
    const userData: InstagramUserData = {
      username: body.username,
      fullName: body.fullName || body.username,
      profilePic: body.profilePic || '',
      followers: body.followers || 0,
      following: body.following || 0,
      posts: body.posts || 0,
      biography: body.biography || '',
      isVerified: body.isVerified || false,
      isPrivate: body.isPrivate || false,
      instagramId: body.instagramId || body.username
    }
    
    // Sincronizar com banco
    const savedData = await syncInstagramUserData(userData)
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ SINCRONIZAÇÃO CONCLUÍDA!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('ID no banco:', savedData.id)
    console.log('Último login:', savedData.last_login)
    console.log('')
    
    return NextResponse.json({
      success: true,
      message: 'Dados sincronizados com sucesso',
      data: {
        id: savedData.id,
        username: savedData.username,
        fullName: savedData.full_name,
        followers: savedData.followers,
        lastLogin: savedData.last_login
      }
    })
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NA SINCRONIZAÇÃO!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Tipo:', error instanceof Error ? error.constructor.name : 'Unknown')
    console.error('Mensagem:', error instanceof Error ? error.message : 'Erro desconhecido')
    console.error('')
    console.error('Stack trace:')
    console.error(error instanceof Error ? error.stack : 'N/A')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('')
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao sincronizar dados. Tente novamente.' 
      },
      { status: 500 }
    )
  }
}