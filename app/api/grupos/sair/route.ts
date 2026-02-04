// app/api/grupos/sair/route.ts
import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { groupId, username } = await request.json()

    if (!groupId || !username) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cleanUsername = username.toLowerCase().trim()

    // 1️⃣ IDENTIFICAR GRUPO
    const grupoCheck = await sql`
      SELECT id, name FROM grupos WHERE id = ${groupId} OR slug = ${groupId} LIMIT 1
    `

    if (grupoCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const realGroupId = grupoCheck.rows[0].id
    const groupName = grupoCheck.rows[0].name

    // 2️⃣ REMOVER MEMBRO (Exterminador)
    await sql`
      DELETE FROM grupo_membros 
      WHERE grupo_id = ${realGroupId} 
      AND LOWER(username) = ${cleanUsername}
    `

    // 3️⃣ VERIFICAR SE O GRUPO FICOU VAZIO
    const countCheck = await sql`
        SELECT COUNT(*) as total FROM grupo_membros WHERE grupo_id = ${realGroupId}
    `
    
    const membrosRestantes = parseInt(countCheck.rows[0].total)
    
    if (membrosRestantes === 0) {
        console.log(`🗑️ Grupo "${groupName}" ficou vazio. Deletando...`)
        await sql`DELETE FROM grupos WHERE id = ${realGroupId}`
        console.log('✅ Grupo deletado do banco.')
        
        return NextResponse.json({ 
            success: true, 
            message: 'Saiu e grupo foi deletado por estar vazio',
            groupDeleted: true
        })
    }

    // Se ainda tem gente, só atualiza o timestamp
    await sql`UPDATE grupos SET updated_at = NOW() WHERE id = ${realGroupId}`

    return NextResponse.json({ 
      success: true, 
      message: 'Saiu do grupo com sucesso',
      groupDeleted: false
    })

  } catch (error: any) {
    console.error('❌ Erro ao sair:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}