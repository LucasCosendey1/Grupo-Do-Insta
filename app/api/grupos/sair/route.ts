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

    if (!groupId || !username) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()

    // 1️⃣ DESCOBRIR O ID REAL DO GRUPO
    const grupoCheck = await sql`
      SELECT id, name FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1
    `

    if (grupoCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const realGroupId = grupoCheck.rows[0].id
    const groupName = grupoCheck.rows[0].name
    
    console.log(`✅ Grupo alvo: ${groupName} (${realGroupId})`)

    // 2️⃣ DELETAR TODAS AS OCORRÊNCIAS (Limpeza de Zumbis)
    // O segredo é o LOWER() = LOWER() que pega tudo
    const deleteResult = await sql`
      DELETE FROM grupo_membros 
      WHERE grupo_id = ${realGroupId} 
      AND LOWER(username) = ${cleanUsername}
    `

    console.log(`🗑️ Registros deletados: ${deleteResult.rowCount}`)

    // 3️⃣ ATUALIZAR TIMESTAMP DO GRUPO
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`

    return NextResponse.json({ 
      success: true, 
      message: 'Saiu do grupo com sucesso',
      deletedCount: deleteResult.rowCount
    })

  } catch (error: any) {
    console.error('❌ Erro ao sair do grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno ao sair do grupo' }, 
      { status: 500 }
    )
  }
}