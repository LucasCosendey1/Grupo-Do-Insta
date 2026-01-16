import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function checkTableStructure() {
  try {
    console.log('🔍 Verificando estrutura da tabela grupo_membros...\n')

    // Ver colunas da tabela
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'grupo_membros'
      ORDER BY ordinal_position
    `

    console.log('📊 Colunas existentes:')
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`)
    })
    console.log('')

    // Ver alguns registros
    const registros = await sql`
      SELECT * FROM grupo_membros LIMIT 5
    `

    console.log('📋 Primeiros registros:')
    if (registros.rows.length === 0) {
      console.log('   (nenhum registro encontrado)')
    } else {
      registros.rows.forEach((row, index) => {
        console.log(`\n   Registro ${index + 1}:`)
        console.log(`   - grupo_id: ${row.grupo_id}`)
        console.log(`   - username: ${row.username}`)
        console.log(`   - full_name: ${row.full_name || '(vazio)'}`)
        console.log(`   - profile_pic: ${row.profile_pic ? 'SIM' : 'NÃO'}`)
        console.log(`   - followers: ${row.followers || 0}`)
        console.log(`   - posts: ${row.posts || 0}`)
      })
    }

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

checkTableStructure()