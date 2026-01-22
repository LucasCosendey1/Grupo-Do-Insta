// scripts/migrate-to-slugs.js
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function migrateToSlugs() {
  console.log('🚀 MIGRAÇÃO PARA SISTEMA DE SLUGS\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. Verificar se coluna slug existe
    console.log('📦 Verificando estrutura do banco...')
    const columns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'grupos' AND column_name = 'slug'
    `
    
    if (columns.rows.length === 0) {
      console.log('   ➕ Adicionando coluna slug...')
      await sql`ALTER TABLE grupos ADD COLUMN slug TEXT UNIQUE`
      console.log('   ✅ Coluna adicionada!\n')
    } else {
      console.log('   ✅ Coluna slug já existe\n')
    }

    // 2. Buscar grupos sem slug
    const grupos = await sql`SELECT id, name FROM grupos WHERE slug IS NULL`
    console.log(`📊 Encontrados ${grupos.rows.length} grupos para migrar\n`)

    if (grupos.rows.length === 0) {
      console.log('✅ Todos os grupos já têm slug!\n')
      process.exit(0)
      return
    }

    // 3. Gerar slugs
    for (const grupo of grupos.rows) {
      const slug = await generateUniqueSlug(grupo.name)
      
      await sql`UPDATE grupos SET slug = ${slug} WHERE id = ${grupo.id}`
      
      console.log(`✓ "${grupo.name}"`)
      console.log(`  Slug: ${slug}`)
      console.log(`  Link: /grupo/${slug}\n`)
    }

    // 4. Criar índice
    console.log('⚡ Criando índice...')
    await sql`CREATE INDEX IF NOT EXISTS idx_grupos_slug ON grupos(slug)`
    console.log('✅ Índice criado!\n')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro na migração:', error)
    process.exit(1)
  }
}

async function generateUniqueSlug(name) {
  const generateSlug = (str) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 60)
  }

  const generatePrefix = (len = 4) => {
    return Math.random().toString(36).substring(2, 2 + len)
  }

  const baseSlug = generateSlug(name)

  for (let i = 0; i < 10; i++) {
    const prefix = generatePrefix(4 + i)
    const slug = `${prefix}-${baseSlug}`

    const exists = await sql`SELECT id FROM grupos WHERE slug = ${slug}`
    if (exists.rows.length === 0) {
      return slug
    }
  }

  // Fallback
  const timestamp = Date.now().toString(36)
  return `${timestamp}-${baseSlug}`
}

migrateToSlugs()