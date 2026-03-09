/**
 * scripts/inspecionar-banco.js
 *
 * Lê e exibe TUDO que existe no banco de dados.
 * NÃO modifica nada — apenas leitura.
 *
 * Rodar: node scripts/inspecionar-banco.js
 */

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
})

async function inspecionar() {
  const client = await pool.connect()

  try {
    console.log('\n')
    console.log('╔══════════════════════════════════════════════════════════╗')
    console.log('║         🔍 INSPEÇÃO COMPLETA DO BANCO DE DADOS           ║')
    console.log('╚══════════════════════════════════════════════════════════╝')

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LISTAR TODAS AS TABELAS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 TABELAS EXISTENTES NO BANCO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const tabelas = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    if (tabelas.rows.length === 0) {
      console.log('❌ Nenhuma tabela encontrada!')
      return
    }

    tabelas.rows.forEach(t => console.log(`   📁 ${t.table_name}`))

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ESTRUTURA DE CADA TABELA (colunas)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🏗️  ESTRUTURA DAS COLUNAS POR TABELA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    for (const tabela of tabelas.rows) {
      const nome = tabela.table_name

      const colunas = await client.query(`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [nome])

      const contagem = await client.query(`SELECT COUNT(*) FROM "${nome}"`)
      const total = contagem.rows[0].count

      console.log(`\n  📁 ${nome.toUpperCase()}  (${total} registros)`)
      console.log('  ' + '─'.repeat(60))

      colunas.rows.forEach(col => {
        const tipo     = col.data_type + (col.character_maximum_length ? `(${col.character_maximum_length})` : '')
        const nullable = col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'
        const def      = col.column_default ? ` | default: ${col.column_default.substring(0, 30)}` : ''
        console.log(`  │ ${col.column_name.padEnd(22)} ${tipo.padEnd(20)} ${nullable}${def}`)
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CONTEÚDO DA TABELA grupos
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👥 GRUPOS CADASTRADOS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const grupos = await client.query(`
      SELECT
        id,
        slug,
        name,
        icon_emoji,
        creator_username,
        created_at,
        (SELECT COUNT(*) FROM grupo_membros WHERE grupo_id = g.id OR grupo_id = g.slug) as membros
      FROM grupos g
      ORDER BY created_at DESC
    `)

    if (grupos.rows.length === 0) {
      console.log('   (nenhum grupo)')
    } else {
      grupos.rows.forEach((g, i) => {
        console.log(`\n  [${i + 1}] ${g.icon_emoji || '👥'} ${g.name}`)
        console.log(`       ID:       ${g.id}`)
        console.log(`       Slug:     ${g.slug || '(sem slug)'}`)
        console.log(`       Criador:  @${g.creator_username}`)
        console.log(`       Membros:  ${g.membros}`)
        console.log(`       Criado:   ${new Date(g.created_at).toLocaleString('pt-BR')}`)
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CONTEÚDO DA TABELA grupo_membros
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🙋 MEMBROS DOS GRUPOS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const membros = await client.query(`
      SELECT
        gm.grupo_id,
        gm.username,
        gm.full_name,
        gm.followers,
        gm.following,
        gm.posts,
        gm.is_verified,
        gm.is_private,
        LENGTH(gm.profile_pic) as foto_tamanho,
        LEFT(gm.profile_pic, 30) as foto_preview,
        gm.added_at
      FROM grupo_membros gm
      ORDER BY gm.grupo_id, gm.added_at ASC
    `)

    if (membros.rows.length === 0) {
      console.log('   (nenhum membro)')
    } else {
      let grupoAtual = null
      membros.rows.forEach(m => {
        if (m.grupo_id !== grupoAtual) {
          grupoAtual = m.grupo_id
          console.log(`\n  📁 Grupo: ${m.grupo_id}`)
          console.log('  ' + '─'.repeat(55))
        }
        const foto = m.foto_tamanho > 0
          ? (m.foto_preview.startsWith('data:image') ? `Base64 (${(m.foto_tamanho/1024).toFixed(1)}KB)` : `URL: ${m.foto_preview}...`)
          : 'SEM FOTO'
        console.log(`  │ @${m.username.padEnd(22)} followers:${String(m.followers).padEnd(8)} foto:${foto}`)
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. CONTEÚDO DA TABELA usuarios
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👤 USUÁRIOS CADASTRADOS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const usuarios = await client.query(`
      SELECT
        username,
        full_name,
        followers,
        following,
        posts,
        is_verified,
        is_private,
        instagram_id,
        LENGTH(profile_pic) as foto_tamanho,
        LEFT(profile_pic, 40) as foto_preview,
        last_login
      FROM usuarios
      ORDER BY last_login DESC
    `)

    if (usuarios.rows.length === 0) {
      console.log('   (nenhum usuário)')
    } else {
      usuarios.rows.forEach((u, i) => {
        const foto = u.foto_tamanho > 0
          ? (u.foto_preview.startsWith('data:image') ? `✅ Base64 (${(u.foto_tamanho/1024).toFixed(1)}KB)` : `⚠️  URL: ${u.foto_preview}...`)
          : '❌ SEM FOTO'
        const login = u.last_login ? new Date(u.last_login).toLocaleString('pt-BR') : 'nunca'
        console.log(`\n  [${i + 1}] @${u.username}`)
        console.log(`       Nome:       ${u.full_name}`)
        console.log(`       Seguidores: ${u.followers} | Seguindo: ${u.following} | Posts: ${u.posts}`)
        console.log(`       Foto:       ${foto}`)
        console.log(`       Último login: ${login}`)
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. RESUMO FINAL
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n')
    console.log('╔══════════════════════════════════════════════════════════╗')
    console.log('║                    📊 RESUMO FINAL                       ║')
    console.log('╠══════════════════════════════════════════════════════════╣')
    console.log(`║  Tabelas:   ${String(tabelas.rows.length).padEnd(46)} ║`)
    console.log(`║  Grupos:    ${String(grupos.rows.length).padEnd(46)} ║`)
    console.log(`║  Membros:   ${String(membros.rows.length).padEnd(46)} ║`)
    console.log(`║  Usuários:  ${String(usuarios.rows.length).padEnd(46)} ║`)

    // Contar fotos com Base64 vs URL nos membros
    const fotosBase64Membros = membros.rows.filter(m => m.foto_preview?.startsWith('data:image')).length
    const fotosUrlMembros    = membros.rows.filter(m => m.foto_tamanho > 0 && !m.foto_preview?.startsWith('data:image')).length
    const semFotoMembros     = membros.rows.filter(m => !m.foto_tamanho || m.foto_tamanho === 0).length

    const fotosBase64Users = usuarios.rows.filter(u => u.foto_preview?.startsWith('data:image')).length
    const fotosUrlUsers    = usuarios.rows.filter(u => u.foto_tamanho > 0 && !u.foto_preview?.startsWith('data:image')).length
    const semFotoUsers     = usuarios.rows.filter(u => !u.foto_tamanho || u.foto_tamanho === 0).length

    console.log('╠══════════════════════════════════════════════════════════╣')
    console.log('║  FOTOS - grupo_membros:                                  ║')
    console.log(`║    ✅ Base64:   ${String(fotosBase64Membros).padEnd(41)} ║`)
    console.log(`║    ⚠️  URL ext: ${String(fotosUrlMembros).padEnd(42)} ║`)
    console.log(`║    ❌ Sem foto: ${String(semFotoMembros).padEnd(42)} ║`)
    console.log('║  FOTOS - usuarios:                                       ║')
    console.log(`║    ✅ Base64:   ${String(fotosBase64Users).padEnd(41)} ║`)
    console.log(`║    ⚠️  URL ext: ${String(fotosUrlUsers).padEnd(42)} ║`)
    console.log(`║    ❌ Sem foto: ${String(semFotoUsers).padEnd(42)} ║`)
    console.log('╚══════════════════════════════════════════════════════════╝')
    console.log('\n')

  } catch (error) {
    console.error('\n❌ ERRO ao inspecionar banco:', error.message)
    console.error(error)
  } finally {
    client.release()
    await pool.end()
  }
}

inspecionar()