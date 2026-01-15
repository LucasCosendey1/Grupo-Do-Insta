import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username } = await request.json()

    if (!groupId || !username) {
      return Response.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    console.log('🚪 Usuário saindo do grupo:', username, 'do grupo', groupId)

    // Verificar se é o criador
    const grupoResult = await sql`
      SELECT creator_username FROM grupos WHERE id = ${groupId}
    `

    if (grupoResult.rows.length === 0) {
      return Response.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const isCreator = grupoResult.rows[0].creator_username === username

    // Remover o usuário do grupo
    const deleteResult = await sql`
      DELETE FROM grupo_membros 
      WHERE grupo_id = ${groupId} AND username = ${username}
    `

    if (deleteResult.rowCount === 0) {
      return Response.json({ error: 'Usuário não encontrado no grupo' }, { status: 404 })
    }

    console.log('✅ Usuário removido:', username)

    // Verificar quantos membros restam
    const membrosResult = await sql`
      SELECT COUNT(*) as total FROM grupo_membros WHERE grupo_id = ${groupId}
    `

    const totalMembros = parseInt(membrosResult.rows[0].total)
    console.log('👥 Membros restantes:', totalMembros)

    // Se não sobrou ninguém, deletar o grupo
    if (totalMembros === 0) {
      console.log('🗑️ Grupo vazio, deletando...')
      
      await sql`
        DELETE FROM grupos WHERE id = ${groupId}
      `
      
      console.log('✅ Grupo deletado do banco de dados')

      return Response.json({
        success: true,
        groupDeleted: true,
        message: 'Você era o último membro. Grupo deletado.'
      })
    }

    // Se era o criador e ainda há membros, transferir criação pro próximo
    if (isCreator && totalMembros > 0) {
      console.log('👑 Transferindo criação do grupo...')
      
      const novoCreador = await sql`
        SELECT username FROM grupo_membros 
        WHERE grupo_id = ${groupId}
        ORDER BY added_at ASC
        LIMIT 1
      `

      if (novoCreador.rows.length > 0) {
        await sql`
          UPDATE grupos 
          SET creator_username = ${novoCreador.rows[0].username}
          WHERE id = ${groupId}
        `
        console.log('✅ Novo criador:', novoCreador.rows[0].username)
      }
    }

    return Response.json({
      success: true,
      groupDeleted: false,
      message: 'Você saiu do grupo'
    })

  } catch (error) {
    console.error('❌ Erro ao sair do grupo:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}