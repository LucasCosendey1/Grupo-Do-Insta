import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function debugGrupo() {
  try {
    console.log('🔍 Buscando último grupo criado...\n')

    // Pegar o último grupo
    const grupos = await sql`
      SELECT * FROM grupos 
      ORDER BY created_at DESC 
      LIMIT 1
    `

    if (grupos.rows.length === 0) {
      console.log('❌ Nenhum grupo encontrado!')
      process.exit(0)
      return
    }

    const grupo = grupos.rows[0]
    console.log('📦 GRUPO:', grupo.name)
    console.log('🆔 ID:', grupo.id)
    console.log('👑 Criador:', grupo.creator_username)
    console.log('')

    // Buscar TODOS os membros desse grupo
    const membros = await sql`
      SELECT * FROM grupo_membros 
      WHERE grupo_id = ${grupo.id}
      ORDER BY added_at ASC
    `

    console.log('👥 TOTAL DE MEMBROS NO BANCO:', membros.rows.length)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    membros.rows.forEach((m, index) => {
      const isCreator = m.username === grupo.creator_username
      
      console.log(`\n${index + 1}. @${m.username} ${isCreator ? '👑 CRIADOR' : ''}`)
      console.log('   ├─ full_name:', m.full_name || '❌ VAZIO')
      console.log('   ├─ profile_pic:', m.profile_pic ? '✅ TEM' : '❌ VAZIO')
      console.log('   ├─ followers:', m.followers || 0)
      console.log('   ├─ following:', m.following || 0)
      console.log('   ├─ posts:', m.posts || 0)
      console.log('   ├─ biography:', m.biography ? `"${m.biography.substring(0, 50)}..."` : '❌ VAZIO')
      console.log('   ├─ is_verified:', m.is_verified ? '✅' : '❌')
      console.log('   └─ added_at:', m.added_at)
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📊 RESUMO:')
    
    const comDados = membros.rows.filter(m => m.profile_pic && m.full_name)
    const semDados = membros.rows.filter(m => !m.profile_pic || !m.full_name)
    
    console.log(`   ✅ Com dados completos: ${comDados.length}`)
    console.log(`   ❌ Sem dados: ${semDados.length}`)
    
    if (semDados.length > 0) {
      console.log('\n⚠️  Membros sem dados:')
      semDados.forEach(m => {
        console.log(`   - @${m.username}`)
      })
    }

    console.log('\n🔗 Testando API...')
    console.log('   URL:', `http://localhost:3000/api/grupos/${grupo.id}`)

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

debugGrupo()