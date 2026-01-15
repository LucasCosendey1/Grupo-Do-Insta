import { sql } from '@vercel/postgres'

export async function POST(request) {
  try {
    const { groupId, username } = await request.json()

    // Verificar se não é o criador
    const grupoResult = await sql`
      SELECT creator_username FROM grupos WHERE id = ${groupId}
    `

    if (grupoResult.rows[0]?.creator_username === username) {
      return Response.json({ error: 'Não pode remover o criador' }, { status: 400 })
    }

    // Remover
    await sql`
      DELETE FROM grupo_membros 
      WHERE grupo_id = ${groupId} AND username = ${username}
    `

    console.log('✅ Membro removido:', username)

    return Response.json({ success: true })

  } catch (error) {
    console.error('❌ Erro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

---

## ✅ **Resumo da Estrutura:**
```
BANCO DE DADOS
├── usuarios (opcional, só registro)
├── grupos (id, name, icon, creator)
└── grupo_membros (grupo_id, username)

FLUXO:
1. Criar grupo → salva em "grupos" + adiciona criador em "grupo_membros"
2. Buscar grupo → pega lista de usernames
3. Frontend → chama /api/scrape para cada username (pegar foto, followers)
4. Mostra na arena