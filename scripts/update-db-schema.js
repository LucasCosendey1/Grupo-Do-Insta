import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function updateSchema() {
  try {
    console.log('🔄 Atualizando schema do banco...\n')

    // Adicionar novas colunas na tabela grupo_membros
    console.log('📦 Adicionando colunas em grupo_membros...')
    
    await sql`
      ALTER TABLE grupo_membros 
      ADD COLUMN IF NOT EXISTS full_name TEXT,
      ADD COLUMN IF NOT EXISTS profile_pic TEXT,
      ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS following INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS posts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS biography TEXT,
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false
    `
    
    console.log('✅ Colunas adicionadas!\n')

    console.log('🎉 Schema atualizado com sucesso!')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

updateSchema()