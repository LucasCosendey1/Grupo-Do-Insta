import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function atualizarTabelaUsuarios() {
  try {
    console.log('🚀 FASE 1: Atualizando tabela usuarios...\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 1. Verificar se a tabela usuarios existe
    console.log('📋 Passo 1: Verificando se tabela usuarios existe...')
    const checkTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'usuarios'
      ) as exists
    `
    
    if (!checkTable.rows[0].exists) {
      console.log('⚠️  Tabela usuarios não existe. Criando...')
      
      await sql`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
      console.log('✅ Tabela usuarios criada!\n')
    } else {
      console.log('✅ Tabela usuarios já existe\n')
    }

    // 2. Adicionar colunas necessárias (se não existirem)
    console.log('📋 Passo 2: Adicionando/verificando colunas...')
    
    const colunas = [
      { nome: 'full_name', tipo: 'TEXT', descricao: 'Nome completo do usuário' },
      { nome: 'profile_pic', tipo: 'TEXT', descricao: 'URL da foto de perfil' },
      { nome: 'followers', tipo: 'INTEGER DEFAULT 0', descricao: 'Número de seguidores' },
      { nome: 'following', tipo: 'INTEGER DEFAULT 0', descricao: 'Número de pessoas seguindo' },
      { nome: 'posts', tipo: 'INTEGER DEFAULT 0', descricao: 'Número de posts' },
      { nome: 'biography', tipo: 'TEXT', descricao: 'Biografia do usuário' },
      { nome: 'is_verified', tipo: 'BOOLEAN DEFAULT false', descricao: 'Conta verificada?' },
      { nome: 'is_private', tipo: 'BOOLEAN DEFAULT false', descricao: 'Conta privada?' },
      { nome: 'instagram_id', tipo: 'TEXT UNIQUE', descricao: 'ID único do Instagram' },
      { nome: 'last_login', tipo: 'TIMESTAMP DEFAULT NOW()', descricao: 'Último login' }
    ]

    for (const coluna of colunas) {
      try {
        await sql.query(`
          ALTER TABLE usuarios 
          ADD COLUMN IF NOT EXISTS ${coluna.nome} ${coluna.tipo}
        `)
        console.log(`   ✅ ${coluna.nome.padEnd(15)} - ${coluna.descricao}`)
      } catch (error) {
        console.log(`   ⚠️  ${coluna.nome.padEnd(15)} - Erro: ${error.message}`)
      }
    }
    
    console.log('\n')

    // 3. Criar índices para performance
    console.log('📋 Passo 3: Criando índices para performance...')
    
    const indices = [
      { nome: 'idx_usuarios_username', coluna: 'username', descricao: 'Busca rápida por username' },
      { nome: 'idx_usuarios_instagram_id', coluna: 'instagram_id', descricao: 'Busca rápida por Instagram ID' },
      { nome: 'idx_usuarios_last_login', coluna: 'last_login DESC', descricao: 'Ordenação por último login' }
    ]

    for (const indice of indices) {
      try {
        await sql.query(`
          CREATE INDEX IF NOT EXISTS ${indice.nome} ON usuarios(${indice.coluna})
        `)
        console.log(`   ✅ ${indice.nome.padEnd(30)} - ${indice.descricao}`)
      } catch (error) {
        console.log(`   ⚠️  ${indice.nome.padEnd(30)} - ${error.message}`)
      }
    }
    
    console.log('\n')

    // 4. Verificar estrutura final
    console.log('📋 Passo 4: Verificando estrutura final...')
    const estrutura = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `

    console.log('\n   📊 Estrutura da tabela usuarios:')
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    estrutura.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'
      const defaultVal = col.column_default ? ` = ${col.column_default}` : ''
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`)
    })
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 5. Estatísticas
    console.log('📋 Passo 5: Estatísticas atuais...')
    const stats = await sql`
      SELECT 
        COUNT(*) as total_usuarios,
        COUNT(profile_pic) as usuarios_com_foto,
        COUNT(instagram_id) as usuarios_com_instagram_id,
        MAX(last_login) as ultimo_login
      FROM usuarios
    `

    if (stats.rows.length > 0) {
      const s = stats.rows[0]
      console.log(`   👥 Total de usuários: ${s.total_usuarios}`)
      console.log(`   📸 Com foto de perfil: ${s.usuarios_com_foto}`)
      console.log(`   🔗 Com Instagram ID: ${s.usuarios_com_instagram_id}`)
      console.log(`   🕐 Último login: ${s.ultimo_login || 'Nenhum login registrado'}`)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ FASE 1 CONCLUÍDA COM SUCESSO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('📝 Próximos passos:')
    console.log('   1. A tabela usuarios está pronta')
    console.log('   2. Próxima fase: Implementar sincronização no login')
    console.log('   3. Testar inserindo um usuário manualmente (opcional)\n')

    process.exit(0)

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NA FASE 1!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Tipo:', error.constructor.name)
    console.error('Mensagem:', error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    process.exit(1)
  }
}

atualizarTabelaUsuarios()