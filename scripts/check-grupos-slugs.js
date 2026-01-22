import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function checkGruposStatus() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 DIAGNÓSTICO COMPLETO DOS GRUPOS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 1. Verificar estrutura da tabela
    console.log('📋 PASSO 1: Verificando estrutura da tabela grupos...\n')
    const colunas = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'grupos'
      ORDER BY ordinal_position
    `
    
    console.log('Colunas encontradas:')
    colunas.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(pode ser NULL)' : '(NOT NULL)'
      console.log(`   ✓ ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${nullable}`)
    })
    
    const temSlug = colunas.rows.some(c => c.column_name === 'slug')
    console.log(`\n   ${temSlug ? '✅' : '❌'} Coluna 'slug' ${temSlug ? 'EXISTE' : 'NÃO EXISTE'}\n`)

    // 2. Listar todos os grupos
    console.log('📊 PASSO 2: Listando todos os grupos...\n')
    const grupos = await sql`
      SELECT id, slug, name, creator_username, created_at
      FROM grupos
      ORDER BY created_at DESC
    `

    if (grupos.rows.length === 0) {
      console.log('   ❌ NENHUM GRUPO ENCONTRADO NO BANCO!\n')
      console.log('   💡 Dica: Crie um grupo novo para testar\n')
    } else {
      console.log(`   Total de grupos: ${grupos.rows.length}\n`)
      
      grupos.rows.forEach((g, index) => {
        console.log(`   ${index + 1}. GRUPO: "${g.name}"`)
        console.log(`      🆔 ID:      ${g.id || '❌ VAZIO'}`)
        console.log(`      🔗 Slug:    ${g.slug || '❌ VAZIO'}`)
        console.log(`      👑 Criador: ${g.creator_username}`)
        console.log(`      📅 Criado:  ${g.created_at}`)
        
        // Verificar qual usar
        const identifier = g.slug || g.id
        console.log(`      🌐 URL:     /grupo/${identifier}`)
        console.log('')
      })
    }

    // 3. Verificar grupos SEM slug
    console.log('⚠️  PASSO 3: Verificando grupos SEM slug...\n')
    const semSlug = await sql`
      SELECT id, name FROM grupos WHERE slug IS NULL
    `
    
    if (semSlug.rows.length > 0) {
      console.log(`   ❌ ${semSlug.rows.length} grupo(s) sem slug encontrado(s):\n`)
      semSlug.rows.forEach(g => {
        console.log(`      - "${g.name}" (ID: ${g.id})`)
      })
      console.log('\n   💡 Execute: node scripts/migrate-to-slugs.js\n')
    } else {
      console.log('   ✅ Todos os grupos têm slug!\n')
    }

    // 4. Verificar membros
    console.log('👥 PASSO 4: Verificando membros dos grupos...\n')
    for (const grupo of grupos.rows) {
      const identifier = grupo.slug || grupo.id
      const membros = await sql`
        SELECT username FROM grupo_membros WHERE grupo_id = ${identifier}
      `
      console.log(`   Grupo "${grupo.name}": ${membros.rows.length} membro(s)`)
      membros.rows.forEach(m => {
        console.log(`      - @${m.username}`)
      })
      console.log('')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ DIAGNÓSTICO CONCLUÍDO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    process.exit(0)

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NO DIAGNÓSTICO!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Tipo:', error.constructor.name)
    console.error('Mensagem:', error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    process.exit(1)
  }
}

checkGruposStatus()