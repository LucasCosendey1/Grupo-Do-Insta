//app/api/grupos/adicionar-membro/route.js
import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username, profileData } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('➕ [API] ADICIONAR MEMBRO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 groupId:', groupId)
    console.log('👤 username:', username)
    console.log('📊 profileData recebido:', profileData ? 'SIM' : 'NÃO')

    // Validação básica
    if (!groupId || !username) {
      console.error('❌ Dados incompletos!')
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    console.log('')
    console.log('🔍 Verificando se grupo existe...')
    
    // Verificar se grupo existe
    const grupoCheck = await sql`
      SELECT id FROM grupos WHERE id = ${groupId}
    `

    if (grupoCheck.rows.length === 0) {
      console.error('❌ Grupo não encontrado!')
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }
    console.log('✅ Grupo existe')

    // Buscar dados do perfil se não foram enviados
    let fullProfileData = profileData
    
    if (!fullProfileData || !fullProfileData.profilePic) {
      console.log('')
      console.log('🔍 profileData incompleto, buscando via API...')
      
      // ✅ CORREÇÃO: Detectar URL base corretamente no Vercel
      const getBaseUrl = () => {
        const host = request.headers.get('host')
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        
        if (host) {
          console.log('📍 Usando host da requisição:', host)
          return `${protocol}://${host}`
        }
        
        if (process.env.VERCEL_URL) {
          console.log('📍 Usando VERCEL_URL:', process.env.VERCEL_URL)
          return `https://${process.env.VERCEL_URL}`
        }
        
        console.log('📍 Usando localhost (desenvolvimento)')
        return 'http://localhost:3000'
      }
      
      const baseUrl = getBaseUrl()
      console.log('🌐 Base URL final:', baseUrl)
      
      const scrapeResponse = await fetch(`${baseUrl}/api/scrape?username=${username}`)
      
      if (scrapeResponse.ok) {
        const scrapedData = await scrapeResponse.json()
        console.log('✅ Dados obtidos da API scrape')
        console.log('📸 Foto URL do scrape:', scrapedData.profilePic ? 'SIM' : 'NÃO')
        
        // 🔥 GARANTIR QUE A FOTO DO SCRAPE SEJA USADA
        fullProfileData = {
          username: scrapedData.username || username,
          fullName: scrapedData.fullName || username,
          profilePic: scrapedData.profilePic || '', // ✅ USA FOTO DO SCRAPE
          followers: scrapedData.followers || 0,
          following: scrapedData.following || 0,
          posts: scrapedData.posts || 0,
          biography: scrapedData.biography || '',
          isPrivate: scrapedData.isPrivate || false,
          isVerified: scrapedData.isVerified || false
        }
      } else {
        console.warn('⚠️ Scrape falhou, usando dados básicos')
        console.warn('   Status:', scrapeResponse.status)
        fullProfileData = {
          username: username,
          fullName: username,
          profilePic: '',
          followers: 0,
          following: 0,
          posts: 0,
          biography: '',
          isPrivate: false,
          isVerified: false
        }
      }
    }

    // 🔥 LOG DETALHADO DA FOTO ANTES DE SALVAR
    console.log('')
    console.log('📸 VERIFICAÇÃO FINAL DA FOTO:')
    console.log('   - Tem profilePic?', !!fullProfileData.profilePic)
    console.log('   - É proxy?', fullProfileData.profilePic?.includes('/api/image-proxy'))
    console.log('   - É genérica?', fullProfileData.profilePic?.includes('ui-avatars'))
    console.log('   - URL completa:', fullProfileData.profilePic || 'VAZIA')

    console.log('')
    console.log('📋 Dados finais para INSERT:')
    console.log('   - username:', fullProfileData.username || username)
    console.log('   - fullName:', fullProfileData.fullName || username)
    console.log('   - profilePic:', fullProfileData.profilePic ? `SIM (${fullProfileData.profilePic.length} chars)` : 'VAZIO')
    console.log('   - followers:', fullProfileData.followers || 0)
    console.log('   - following:', fullProfileData.following || 0)
    console.log('   - posts:', fullProfileData.posts || 0)
    console.log('   - biography:', fullProfileData.biography ? `"${fullProfileData.biography.substring(0, 30)}..."` : 'VAZIO')
    console.log('   - isPrivate:', fullProfileData.isPrivate || false)
    console.log('   - isVerified:', fullProfileData.isVerified || false)

    // ✅ VALIDAÇÃO CRÍTICA: Garantir que campos obrigatórios não são undefined
    const dadosParaInserir = {
      groupId: groupId,
      username: fullProfileData.username || username,
      fullName: fullProfileData.fullName || username,
      profilePic: fullProfileData.profilePic || '',
      followers: fullProfileData.followers || 0,
      following: fullProfileData.following || 0,
      posts: fullProfileData.posts || 0,
      biography: fullProfileData.biography || '',
      isPrivate: fullProfileData.isPrivate === true,
      isVerified: fullProfileData.isVerified === true
    }

    console.log('')
    console.log('💾 Executando INSERT...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      await sql`
        INSERT INTO grupo_membros (
          grupo_id, 
          username,
          full_name,
          profile_pic,
          followers,
          following,
          posts,
          biography,
          is_private,
          is_verified
        )
        VALUES (
          ${dadosParaInserir.groupId},
          ${dadosParaInserir.username},
          ${dadosParaInserir.fullName},
          ${dadosParaInserir.profilePic},
          ${dadosParaInserir.followers},
          ${dadosParaInserir.following},
          ${dadosParaInserir.posts},
          ${dadosParaInserir.biography},
          ${dadosParaInserir.isPrivate},
          ${dadosParaInserir.isVerified}
        )
      `

      console.log('✅ INSERT bem-sucedido!')

      // Atualizar timestamp do grupo
      await sql`
        UPDATE grupos SET updated_at = NOW() WHERE id = ${groupId}
      `

      console.log('✅ Timestamp do grupo atualizado')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      return Response.json({ 
        success: true,
        profile: fullProfileData 
      })

    } catch (insertError) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ ERRO NO INSERT!')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('Tipo:', insertError.constructor.name)
      console.error('Mensagem:', insertError.message)
      console.error('Code:', insertError.code || 'N/A')
      console.error('')

      // Detectar tipo de erro
      if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
        console.error('💡 Causa: UNIQUE constraint')
        console.error('   O usuário já está no grupo')
        return Response.json({ error: 'Usuário já está no grupo' }, { status: 400 })
      }
      
      if (insertError.message.includes('null value') || insertError.message.includes('violates not-null')) {
        console.error('💡 Causa: Campo obrigatório NULL')
        console.error('   Algum campo obrigatório está com valor NULL/undefined')
        console.error('')
        console.error('Dados que tentamos inserir:')
        console.error(JSON.stringify(dadosParaInserir, null, 2))
      }
      
      if (insertError.message.includes('invalid input syntax') || insertError.message.includes('type')) {
        console.error('💡 Causa: Tipo de dado incorreto')
        console.error('   Um campo está recebendo tipo errado (ex: string em vez de int)')
      }
      
      if (insertError.message.includes('value too long') || insertError.message.includes('length')) {
        console.error('💡 Causa: Valor muito longo')
        console.error('   Campo profile_pic pode ser muito grande')
        console.error('   Tamanho atual:', dadosParaInserir.profilePic.length)
      }

      console.error('')
      console.error('Stack trace completo:')
      console.error(insertError.stack)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      throw insertError
    }

  } catch (error) {
    console.error('❌ Erro geral ao adicionar membro:', error.message)
    return Response.json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}