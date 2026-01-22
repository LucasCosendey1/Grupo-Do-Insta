// scripts/add-slug-to-grupos.js
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function addSlugColumn() {
  try {
    console.log('📦 Adicionando coluna slug na tabela grupos...\n')

    // 1. Adicionar coluna
    await sql`
      ALTER TABLE grupos 
      ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE
    `
    console.log('✅ Coluna slug adicionada!\n')

    // 2. Criar índice para performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_grupos_slug ON grupos(slug)
    `
    console.log('✅ Índice criado!\n')

    // 3. Migrar grupos existentes (gerar slugs retroativos)
    const grupos = await sql`SELECT id, name FROM grupos WHERE slug IS NULL`
    
    console.log(`🔄 Migrando ${grupos.rows.length} grupos existentes...\n`)
    
    for (const grupo of grupos.rows) {
      const slug = await generateUniqueSlug(grupo.name)
      await sql`UPDATE grupos SET slug = ${slug} WHERE id = ${grupo.id}`
      console.log(`   ✓ ${grupo.name} → ${slug}`)
    }

    console.log('\n🎉 Migração concluída!\n')
    process.exit(0)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

// Função auxiliar (reutilizar no código principal)
async function generateUniqueSlug(name, attempt = 0) {
  const { generateSlug, generatePrefix } = await import('../lib/slug-utils.js')
  
  const baseSlug = generateSlug(name)
  const prefix = generatePrefix()
  const slug = `${prefix}-${baseSlug}`
  
  // Verificar se já existe
  const exists = await sql`SELECT id FROM grupos WHERE slug = ${slug}`
  
  if (exists.rows.length > 0) {
    // Conflito! Tentar novamente com novo prefixo
    return generateUniqueSlug(name, attempt + 1)
  }
  
  return slug
}

addSlugColumn()