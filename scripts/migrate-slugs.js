// scripts/migrate-slugs.js
const { sql } = require('@vercel/postgres')

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
}

function generatePrefix(length = 4) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

async function migrateToSlugs() {
  try {
    console.log('🚀 Iniciando migração de slugs...\n')

    // 1. Buscar grupos sem slug
    const result = await sql`
      SELECT id, name FROM grupos WHERE slug IS NULL
    `

    if (result.rows.length === 0) {
      console.log('✅ Todos os grupos já têm slug!')
      process.exit(0)
    }

    console.log(`📦 Encontrados ${result.rows.length} grupos sem slug:\n`)

    // 2. Gerar slug para cada grupo
    for (const group of result.rows) {
      const baseSlug = generateSlug(group.name)
      const prefix = generatePrefix()
      const slug = `${prefix}-${baseSlug}`

      console.log(`  📝 ${group.name}`)
      console.log(`     ID:   ${group.id}`)
      console.log(`     Slug: ${slug}\n`)

      // 3. Atualizar no banco
      await sql`
        UPDATE grupos 
        SET slug = ${slug}
        WHERE id = ${group.id}
      `
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log(`🎉 ${result.rows.length} grupos atualizados`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    process.exit(0)

  } catch (error) {
    console.error('❌ Erro na migração:', error)
    process.exit(1)
  }
}

migrateToSlugs()