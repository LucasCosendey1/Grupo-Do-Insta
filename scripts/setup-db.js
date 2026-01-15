import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function setupDatabase() {
  try {
    console.log('🚀 Criando estrutura do banco...\n')

    // Tabela de usuários (só para referência)
    console.log('📦 Criando tabela "usuarios"...')
    await sql`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ Tabela "usuarios" criada!\n')

    // Tabela de grupos
    console.log('📦 Criando tabela "grupos"...')
    await sql`
      CREATE TABLE IF NOT EXISTS grupos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon_emoji TEXT DEFAULT '⚡',
        icon_name TEXT DEFAULT 'Raio',
        creator_username TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ Tabela "grupos" criada!\n')

    // Tabela de membros do grupo
    console.log('📦 Criando tabela "grupo_membros"...')
    await sql`
      CREATE TABLE IF NOT EXISTS grupo_membros (
        id SERIAL PRIMARY KEY,
        grupo_id TEXT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(grupo_id, username)
      )
    `
    console.log('✅ Tabela "grupo_membros" criada!\n')

    // Índices
    console.log('⚡ Criando índices...')
    await sql`CREATE INDEX IF NOT EXISTS idx_grupo_membros_grupo ON grupo_membros(grupo_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_grupo_membros_username ON grupo_membros(username)`
    console.log('✅ Índices criados!\n')

    console.log('🎉 Banco configurado com sucesso!')
    console.log('📊 Estrutura:')
    console.log('   ✅ usuarios')
    console.log('   ✅ grupos')
    console.log('   ✅ grupo_membros\n')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

setupDatabase()