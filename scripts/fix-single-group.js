// scripts/fix-single-group.js

// 1. CARREGAR VARIÁVEIS PRIMEIRO (Antes de qualquer outro import)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// 2. AGORA SIM IMPORTAR O SQL
const { sql } = require('@vercel/postgres');

async function fixSingleGroup() {
  try {
    // Verificação extra para você saber se o dotenv funcionou
    if (!process.env.POSTGRES_URL) {
       console.error('❌ Erro: POSTGRES_URL não encontrada no arquivo .env.local');
       console.log('Caminho tentado:', path.resolve(__dirname, '../.env.local'));
       process.exit(1);
    }

    console.log('🔧 TESTE SEGURO - Atualizar 1 grupo específico\n')

    // 🎯 CONFIGURAÇÃO (MUDE AQUI)
    const GROUP_ID = 'OMzcBiv_3V'     // ← ID do grupo antigo
    const NEW_SLUG = 'omzc-foi'       // ← Slug que você quer dar

    console.log('📦 Grupo alvo:')
    console.log(`   ID:   ${GROUP_ID}`)
    console.log(`   Slug: ${NEW_SLUG}\n`)

    // 1. Verificar se grupo existe
    const check = await sql`
      SELECT id, name, slug FROM grupos WHERE id = ${GROUP_ID}
    `

    if (check.rows.length === 0) {
      console.log('❌ Grupo não encontrado!')
      process.exit(1)
    }

    const grupo = check.rows[0]
    console.log('✅ Grupo encontrado:')
    console.log(`   Nome: ${grupo.name}`)
    console.log(`   Slug atual: ${grupo.slug || 'NULL'}\n`)

    // 2. Verificar se slug já está em uso
    const slugCheck = await sql`
      SELECT id FROM grupos WHERE slug = ${NEW_SLUG}
    `

    if (slugCheck.rows.length > 0) {
      console.log('⚠️  Slug já existe! Escolha outro.')
      process.exit(1)
    }

    // 3. Confirmar ação
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 ATUALIZAÇÃO QUE SERÁ FEITA:')
    console.log(`   UPDATE grupos SET slug = '${NEW_SLUG}' WHERE id = '${GROUP_ID}'`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 4. Fazer update
    await sql`
      UPDATE grupos 
      SET slug = ${NEW_SLUG}
      WHERE id = ${GROUP_ID}
    `

    console.log('✅ ATUALIZAÇÃO CONCLUÍDA!')
    console.log(`🎉 Grupo '${grupo.name}' agora tem slug: ${NEW_SLUG}\n`)

    // 5. Verificar resultado final
    const verify = await sql`
      SELECT id, name, slug FROM grupos WHERE id = ${GROUP_ID}
    `

    console.log('✅ VERIFICAÇÃO NO BANCO:')
    console.log(`   ID:   ${verify.rows[0].id}`)
    console.log(`   Nome: ${verify.rows[0].name}`)
    console.log(`   Slug: ${verify.rows[0].slug}`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 Agora você pode acessar:')
    console.log(`   /grupo/${NEW_SLUG}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message)
    process.exit(1)
  }
}

fixSingleGroup()