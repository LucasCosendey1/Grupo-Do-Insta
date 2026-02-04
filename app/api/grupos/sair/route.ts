// app/api/grupos/sair/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { groupId, username } = await request.json()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🚪 [API] SAIR DO GRUPO (MODO EXTERMINADOR)')
    console.log('📦 Grupo:', groupId)
    console.log('👤 Usuário:', username)

    // 1. Validação
    if (!groupId || !username) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()

    // 2. Identificar Grupo (Aceita ID ou Slug)
    const grupoCheck = await sql`
      SELECT id, name FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1
    `

    if (grupoCheck.rows.length === 0) {
      console.error('❌ Grupo não encontrado para sair.')
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const realGroupId = grupoCheck.rows[0].id
    const groupName = grupoCheck.rows[0].name

    // 3. REMOVER MEMBRO (O Exterminador)
    // Deleta QUALQUER ocorrência desse username no grupo (LOWER garante que pega 'Ata' e 'ata')
    const deleteResult = await sql`
      DELETE FROM grupo_membros 
      WHERE grupo_id = ${realGroupId} 
      AND LOWER(username) = ${cleanUsername}
    `

    console.log(`🗑️ Registros removidos (Zumbis mortos): ${deleteResult.rowCount}`)

    // 4. VERIFICAR SE O GRUPO FICOU VAZIO
    const countCheck = await sql`
        SELECT COUNT(*) as total FROM grupo_membros WHERE grupo_id = ${realGroupId}
    `
    
    // Garante conversão segura para número
    const membrosRestantes = Number(countCheck.rows[0].total)
    console.log(`👥 Membros restantes no grupo: ${membrosRestantes}`)
    
    if (membrosRestantes === 0) {
        console.log(`🧹 Grupo "${groupName}" ficou vazio. Deletando permanentemente...`)
        
        // Deleta o grupo
        await sql`DELETE FROM grupos WHERE id = ${realGroupId}`
        
        console.log('✅ Grupo deletado do banco.')
        
        return NextResponse.json({ 
            success: true, 
            message: 'Saiu e o grupo foi deletado por estar vazio',
            groupDeleted: true
        })
    }

    // 5. Se ainda tem gente, atualiza o timestamp para o grupo subir na lista
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`
    console.log('✅ Saída processada com sucesso. Grupo continua ativo.')

    return NextResponse.json({ 
      success: true, 
      message: 'Saiu do grupo com sucesso',
      groupDeleted: false
    })

  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO AO SAIR:', error)
    return NextResponse.json({ error: 'Erro interno ao processar saída' }, { status: 500 })
  }
}