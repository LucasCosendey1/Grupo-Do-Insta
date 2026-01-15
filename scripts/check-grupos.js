import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function checkGrupos() {
  try {
    console.log('🔍 Verificando grupos no banco...\n')

    // Listar todos os grupos
    const grupos = await sql`SELECT * FROM grupos ORDER BY created_at DESC`
    
    console.log('📊 Total de grupos:', grupos.rows.length)
    console.log('')
    
    if (grupos.rows.length === 0) {
      console.log('❌ Nenhum grupo encontrado no banco!')
      console.log('💡 Crie um grupo novo para testar\n')
    } else {
      console.log('✅ Grupos encontrados:\n')
      
      for (const grupo of grupos.rows) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📦 Grupo:', grupo.name)
        console.log('🆔 ID:', grupo.id)
        console.log('👤 Criador:', grupo.creator_username)
        console.log('📅 Criado em:', grupo.created_at)
        
        // Buscar membros
        const membros = await sql`
          SELECT username FROM grupo_membros 
          WHERE grupo_id = ${grupo.id}
        `
        
        console.log('👥 Membros:', membros.rows.map(m => '@' + m.username).join(', '))
        console.log('🔗 Link:', `http://localhost:3000/grupo/${grupo.id}`)
        console.log('')
      }
    }

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

checkGrupos()