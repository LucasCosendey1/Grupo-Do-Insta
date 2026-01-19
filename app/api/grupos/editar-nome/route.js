import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, newName } = await request.json()

    console.log('✏️ [API] EDITAR NOME DO GRUPO')
    console.log('📦 Grupo:', groupId)
    console.log('📝 Novo nome:', newName)

    if (!groupId || !newName) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    if (newName.trim().length === 0) {
      return Response.json({ error: 'Nome não pode ser vazio' }, { status: 400 })
    }

    if (newName.length > 50) {
      return Response.json({ error: 'Nome muito longo (máximo 50 caracteres)' }, { status: 400 })
    }

    // Verificar se grupo existe
    const grupoCheck = await sql`
      SELECT id, name FROM grupos WHERE id = ${groupId}
    `

    if (grupoCheck.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    console.log('📌 Nome anterior:', grupoCheck.rows[0].name)

    // Atualizar nome
    await sql`
      UPDATE grupos 
      SET name = ${newName.trim()}, updated_at = NOW()
      WHERE id = ${groupId}
    `

    console.log('✅ Nome atualizado com sucesso!')

    return Response.json({ 
      success: true,
      newName: newName.trim(),
      oldName: grupoCheck.rows[0].name
    })

  } catch (error) {
    console.error('❌ Erro ao editar nome:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}