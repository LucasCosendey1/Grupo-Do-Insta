import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function testarInsert() {
  try {
    console.log('🧪 TESTANDO INSERT DE MEMBRO NO BANCO\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Pegar último grupo criado
    const grupos = await sql`
      SELECT id, name, creator_username 
      FROM grupos 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (grupos.rows.length === 0) {
      console.log('❌ Nenhum grupo encontrado!')
      process.exit(1)
    }

    const grupo = grupos.rows[0]
    console.log('📦 Grupo encontrado:', grupo.name)
    console.log('🆔 ID:', grupo.id)
    console.log('👑 Criador:', grupo.creator_username)
    console.log('')

    // Listar membros atuais
    const membrosAtuais = await sql`
      SELECT username FROM grupo_membros WHERE grupo_id = ${grupo.id}
    `
    console.log('👥 Membros atuais:', membrosAtuais.rows.length)
    membrosAtuais.rows.forEach(m => {
      console.log('   - @' + m.username)
    })
    console.log('')

    // Tentar inserir um membro de teste
    const testUsername = 'ata'
    const testData = {
      username: testUsername,
      fullName: 'ATA Test',
      profilePic: '/api/image-proxy?url=https%3A%2F%2Finstagram.fssa13-1.fna.fbcdn.net%2Fv%2Ft51.2885-19%2F471140622_1324822955225826_1519758965048868992_n.jpg%3Fstp%3Ddst-jpg_s150x150_tt6%26_nc_ht%3Dinstagram.fssa13-1.fna.fbcdn.net%26_nc_cat%3D110%26_nc_ohc%3Dql-gXNvNvJcQ7kNvgEP8hBh%26_nc_gid%3D5fd8f56c1e2d418382af84ebd39ca1d0%26edm%3DAJgCAUABAAAA%26ccb%3D7-5%26oh%3D00_AYCZH6B6r8Axt63c6DznwIvb7aCZ3-jKkZFu1nz7OjEAtw%26oe%3D67913EA5%26_nc_sid%3Df93d1f&username=ata',
      followers: 910,
      following: 0,
      posts: 0,
      biography: '',
      isPrivate: false,
      isVerified: false
    }

    console.log('🔍 Dados do membro de teste:')
    console.log('   - username:', testData.username)
    console.log('   - fullName:', testData.fullName)
    console.log('   - profilePic:', testData.profilePic ? 'SIM (tamanho: ' + testData.profilePic.length + ')' : 'NÃO')
    console.log('   - followers:', testData.followers)
    console.log('')

    console.log('💾 Tentando INSERT...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      const result = await sql`
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
          ${grupo.id},
          ${testData.username},
          ${testData.fullName},
          ${testData.profilePic},
          ${testData.followers},
          ${testData.following},
          ${testData.posts},
          ${testData.biography},
          ${testData.isPrivate},
          ${testData.isVerified}
        )
      `

      console.log('✅ INSERT bem-sucedido!')
      console.log('📊 Rows affected:', result.rowCount)
      console.log('')

      // Verificar se foi inserido
      const verificacao = await sql`
        SELECT username FROM grupo_membros WHERE grupo_id = ${grupo.id}
      `
      
      console.log('✅ Verificação - Total de membros agora:', verificacao.rows.length)
      verificacao.rows.forEach(m => {
        console.log('   - @' + m.username)
      })

    } catch (insertError) {
      console.error('❌ ERRO NO INSERT!')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('Tipo:', insertError.constructor.name)
      console.error('Mensagem:', insertError.message)
      console.error('Code:', insertError.code)
      console.error('')
      
      if (insertError.message.includes('unique')) {
        console.log('💡 Causa: UNIQUE constraint - o usuário já existe no grupo')
        console.log('   → Isso é esperado se você rodar o script múltiplas vezes')
      } else if (insertError.message.includes('null')) {
        console.log('💡 Causa: Campo NOT NULL está recebendo valor nulo')
        console.log('   → Verifique se todos os campos obrigatórios têm valor')
      } else if (insertError.message.includes('type')) {
        console.log('💡 Causa: Tipo de dado incorreto')
        console.log('   → Verifique se está enviando string onde espera int (ou vice-versa)')
      } else if (insertError.message.includes('length') || insertError.message.includes('too long')) {
        console.log('💡 Causa: Valor muito longo para o campo')
        console.log('   → profile_pic pode ser muito grande')
      } else {
        console.log('💡 Causa desconhecida - veja detalhes acima')
      }
      
      console.error('')
      console.error('Stack trace:')
      console.error(insertError.stack)
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 CONCLUSÃO:')
    console.log('')
    console.log('Se o INSERT funcionou aqui mas não funciona na API,')
    console.log('o problema está no código da API /api/grupos/adicionar-membro')
    console.log('')
    console.log('Se o INSERT falhou aqui, o problema está no schema do banco')
    console.log('ou nos dados que estão sendo enviados.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro geral:', error)
    process.exit(1)
  }
}

testarInsert()