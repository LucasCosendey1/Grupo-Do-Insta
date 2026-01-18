// lib/sync-instagram-data.ts
import { sql } from '@vercel/postgres'

/**
 * Interface para dados do Instagram
 */
export interface InstagramUserData {
  username: string
  fullName: string
  profilePic: string
  followers: number
  following: number
  posts: number
  biography: string
  isVerified: boolean
  isPrivate: boolean
  instagramId: string
}

/**
 * Sincroniza dados do usuário do Instagram com o PostgreSQL
 * Usa INSERT ... ON CONFLICT DO UPDATE (UPSERT)
 * 
 * @param userData - Dados do Instagram a serem sincronizados
 * @returns Dados do usuário salvos no banco
 */
export async function syncInstagramUserData(userData: InstagramUserData) {
  try {
    console.log('📊 Sincronizando dados do Instagram para:', userData.username)
    
    const result = await sql`
      INSERT INTO usuarios (
        username,
        full_name,
        profile_pic,
        followers,
        following,
        posts,
        biography,
        is_verified,
        is_private,
        instagram_id,
        last_login
      ) VALUES (
        ${userData.username},
        ${userData.fullName},
        ${userData.profilePic},
        ${userData.followers},
        ${userData.following},
        ${userData.posts},
        ${userData.biography},
        ${userData.isVerified},
        ${userData.isPrivate},
        ${userData.instagramId},
        NOW()
      )
      ON CONFLICT (username) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        following = EXCLUDED.following,
        posts = EXCLUDED.posts,
        biography = EXCLUDED.biography,
        is_verified = EXCLUDED.is_verified,
        is_private = EXCLUDED.is_private,
        instagram_id = EXCLUDED.instagram_id,
        last_login = NOW()
      RETURNING *
    `
    
    console.log('✅ Dados sincronizados com sucesso!')
    console.log(`   Username: ${userData.username}`)
    console.log(`   Followers: ${userData.followers}`)
    console.log(`   Foto: ${userData.profilePic ? 'SIM' : 'NÃO'}`)
    
    return result.rows[0]
    
  } catch (error) {
    console.error('❌ Erro ao sincronizar dados do Instagram:', error)
    throw error
  }
}

/**
 * Busca dados do usuário no banco
 * 
 * @param username - Username do Instagram
 * @returns Dados do usuário ou null se não encontrado
 */
export async function getUserFromDatabase(username: string) {
  try {
    const result = await sql`
      SELECT * FROM usuarios WHERE username = ${username}
    `
    
    return result.rows.length > 0 ? result.rows[0] : null
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuário do banco:', error)
    throw error
  }
}

/**
 * Verifica se usuário precisa de atualização (passou mais de 24h)
 * 
 * @param username - Username do Instagram
 * @returns true se precisa atualizar, false se dados estão frescos
 */
export async function needsRefresh(username: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT last_login FROM usuarios WHERE username = ${username}
    `
    
    if (result.rows.length === 0) {
      return true // Usuário não existe, precisa criar
    }
    
    const lastLogin = new Date(result.rows[0].last_login)
    const horasSemAtualizar = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60)
    
    const precisa = horasSemAtualizar >= 24
    
    if (precisa) {
      console.log(`🔄 Usuário ${username} precisa atualizar (${Math.floor(horasSemAtualizar)}h sem atualizar)`)
    } else {
      console.log(`✅ Dados de ${username} estão frescos (${Math.floor(horasSemAtualizar)}h atrás)`)
    }
    
    return precisa
    
  } catch (error) {
    console.error('❌ Erro ao verificar necessidade de refresh:', error)
    return true // Em caso de erro, forçar atualização
  }
}

/**
 * Busca dados atualizados do Instagram via API de scrape
 * ATENÇÃO: Esta função ainda usa o scrape antigo
 * TODO: Substituir por Instagram Graph API quando migrar para NextAuth
 * 
 * @param username - Username do Instagram
 * @returns Dados do Instagram ou null se falhar
 */
export async function fetchInstagramData(username: string): Promise<InstagramUserData | null> {
  try {
    console.log('🔍 Buscando dados do Instagram para:', username)
    
    // TEMPORÁRIO: Usar API de scrape existente
    // Na FASE 3, isso virá do NextAuth/Instagram Graph API
    const response = await fetch(`/api/scrape?username=${username}`)
    
    if (!response.ok) {
      console.error('❌ Falha ao buscar dados do Instagram')
      return null
    }
    
    const data = await response.json()
    
    return {
      username: data.username,
      fullName: data.fullName || data.username,
      profilePic: data.profilePic || '',
      followers: data.followers || 0,
      following: data.following || 0,
      posts: data.posts || 0,
      biography: data.biography || '',
      isVerified: data.isVerified || false,
      isPrivate: data.isPrivate || false,
      instagramId: data.username // TEMPORÁRIO: usar username como ID
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do Instagram:', error)
    return null
  }
}

/**
 * Força atualização dos dados de um usuário
 * Busca do Instagram e sincroniza com o banco
 * 
 * @param username - Username do Instagram
 * @returns Dados atualizados ou null se falhar
 */
export async function forceRefreshUser(username: string) {
  try {
    console.log('🔄 Forçando atualização para:', username)
    
    const instagramData = await fetchInstagramData(username)
    
    if (!instagramData) {
      console.error('❌ Não foi possível obter dados do Instagram')
      return null
    }
    
    const savedData = await syncInstagramUserData(instagramData)
    
    return savedData
    
  } catch (error) {
    console.error('❌ Erro ao forçar atualização:', error)
    return null
  }
}

/**
 * Atualiza usuário SE passou mais de 24h
 * Se não passou, retorna dados do banco sem atualizar
 * 
 * @param username - Username do Instagram
 * @returns Dados do usuário (atualizados ou do cache)
 */
export async function getOrRefreshUser(username: string) {
  try {
    const precisa = await needsRefresh(username)
    
    if (precisa) {
      // Passou 24h, buscar dados frescos
      console.log('🔄 Atualizando dados (passou 24h)...')
      return await forceRefreshUser(username)
    } else {
      // Dados ainda frescos, pegar do banco
      console.log('✅ Usando dados do cache (< 24h)')
      return await getUserFromDatabase(username)
    }
    
  } catch (error) {
    console.error('❌ Erro em getOrRefreshUser:', error)
    // Fallback: tentar buscar do banco mesmo com erro
    return await getUserFromDatabase(username)
  }
}