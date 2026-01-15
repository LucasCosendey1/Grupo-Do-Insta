import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username } = await request.json()

    if (!groupId || !username) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Verificar se não é o criador
    const grupoResult = await sql`
      SELECT creator_username FROM grupos WHERE id = ${groupId}
    `

    if (grupoResult.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    if (grupoResult.rows[0].creator_username === username) {
      return Response.json({ error: 'Não pode remover o criador' }, { status: 400 })
    }

    // Remover
    const deleteResult = await sql`
      DELETE FROM grupo_membros 
      WHERE grupo_id = ${groupId} AND username = ${username}
    `

    if (deleteResult.rowCount === 0) {
      return Response.json({ error: 'Usuário não encontrado no grupo' }, { status: 404 })
    }

    // Atualizar timestamp
    await sql`
      UPDATE grupos SET updated_at = NOW() WHERE id = ${groupId}
    `

    console.log('✅ Membro removido:', username, 'do grupo', groupId)

    return Response.json({ success: true })

  } catch (error) {
    console.error('❌ Erro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}