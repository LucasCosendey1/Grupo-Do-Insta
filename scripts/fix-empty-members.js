import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function fixEmptyMembers() {
  try {
    console.log('🔧 Corrigindo membros sem dados...\n')

    // Buscar membros sem dados (profile_pic vazio ou followers = 0)
    const emptyMembers = await sql`
      SELECT DISTINCT grupo_id, username 
      FROM grupo_membros 
      WHERE profile_pic IS NULL 
         OR profile_pic = '' 
         OR followers = 0
         OR full_name IS NULL
         OR full_name = ''
    `

    console.log('📋 Total de membros sem dados:', emptyMembers.rows.length)

    if (emptyMembers.rows.length === 0) {
      console.log('✅ Nenhum membro precisa ser corrigido!')
      process.exit(0)
      return
    }

    let fixed = 0
    let failed = 0

    for (const member of emptyMembers.rows) {
      console.log(`\n🔍 Buscando dados de @${member.username}...`)
      
      try {
        // Buscar dados do Instagram
        const response = await fetch(`http://localhost:3000/api/scrape?username=${member.username}`)
        
        if (response.ok) {
          const data = await response.json()
          
          // Atualizar no banco
          await sql`
            UPDATE grupo_membros
            SET 
              full_name = ${data.fullName || member.username},
              profile_pic = ${data.profilePic || ''},
              followers = ${data.followers || 0},
              following = ${data.following || 0},
              posts = ${data.posts || 0},
              biography = ${data.biography || ''},
              is_private = ${data.isPrivate || false},
              is_verified = ${data.isVerified || false}
            WHERE grupo_id = ${member.grupo_id} 
              AND username = ${member.username}
          `
          
          console.log(`✅ Atualizado: @${member.username} (${data.followers} seguidores)`)
          fixed++
          
          // Delay para não sobrecarregar API
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } else {
          console.log(`⚠️ Não foi possível buscar: @${member.username}`)
          failed++
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar @${member.username}:`, error.message)
        failed++
      }
    }

    console.log('\n📊 Resumo:')
    console.log(`   ✅ Corrigidos: ${fixed}`)
    console.log(`   ❌ Falharam: ${failed}`)
    console.log('\n🎉 Processo concluído!')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

fixEmptyMembers()