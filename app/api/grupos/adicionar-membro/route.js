import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username } = await request.json()

    if (!groupId || !username) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Adicionar membro (UNIQUE constraint evita duplicatas)
    await sql`
      INSERT INTO grupo_membros (grupo_id, username)
      VALUES (${groupId}, ${username})
    `

    // Atualizar timestamp do grupo
    await sql`
      UPDATE grupos SET updated_at = NOW() WHERE id = ${groupId}
    `

    console.log('✅ Membro adicionado:', username)

    return Response.json({ success: true })

  } catch (error) {
    if (error.message.includes('unique')) {
      return Response.json({ error: 'Usuário já está no grupo' }, { status: 400 })
    }
    console.error('❌ Erro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}