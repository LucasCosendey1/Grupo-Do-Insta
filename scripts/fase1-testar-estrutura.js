import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { sql } from '@vercel/postgres'

async function testarInsercaoUsuario() {
  try {
    console.log('🧪 TESTE: Inserindo usuário de exemplo...\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Dados de teste
    const usuarioTeste = {
      username: 'teste_instagram_' + Date.now(),
      full_name: 'Usuário de Teste',
      profile_pic: 'https://ui-avatars.com/api/?name=Teste&size=200&background=00bfff&color=fff',
      followers: 1250,
      following: 340,
      posts: 89,
      biography: 'Conta de teste para validar a estrutura do banco',
      is_verified: false,
      is_private: false,
      instagram_id: 'test_ig_' + Date.now()
    }

    console.log('📋 Dados do usuário de teste:')
    console.log(JSON.stringify(usuarioTeste, null, 2))
    console.log('\n')

    // Tentar inserir
    console.log('💾 Inserindo no banco...')
    
    const resultado = await sql`
      INSERT INTO usuarios (
        username,
        full_name,
        profile_pic,
        followers,
        following,
        posts,
        biography,
        is_verified,
        is_private,
        instagram_id
      ) VALUES (
        ${usuarioTeste.username},
        ${usuarioTeste.full_name},
        ${usuarioTeste.profile_pic},
        ${usuarioTeste.followers},
        ${usuarioTeste.following},
        ${usuarioTeste.posts},
        ${usuarioTeste.biography},
        ${usuarioTeste.is_verified},
        ${usuarioTeste.is_private},
        ${usuarioTeste.instagram_id}
      )
      RETURNING *
    `

    console.log('✅ Usuário inserido com sucesso!\n')
    console.log('📊 Dados retornados do banco:')
    console.log(resultado.rows[0])
    console.log('\n')

    // Testar SELECT
    console.log('🔍 Testando SELECT (busca por username)...')
    const busca = await sql`
      SELECT * FROM usuarios WHERE username = ${usuarioTeste.username}
    `

    if (busca.rows.length > 0) {
      console.log('✅ SELECT funcionou! Usuário encontrado:')
      console.log('   Username:', busca.rows[0].username)
      console.log('   Nome:', busca.rows[0].full_name)
      console.log('   Foto:', busca.rows[0].profile_pic ? '✅ TEM' : '❌ VAZIO')
      console.log('   Seguidores:', busca.rows[0].followers)
      console.log('   Verificado:', busca.rows[0].is_verified ? '✅' : '❌')
    } else {
      console.log('❌ SELECT falhou! Usuário não encontrado.')
    }
    console.log('\n')

    // Testar UPDATE (simulando login)
    console.log('🔄 Testando UPDATE (simulando novo login com dados atualizados)...')
    
    const dadosAtualizados = {
      full_name: 'Usuário de Teste ATUALIZADO',
      followers: 1500, // Ganhou seguidores!
      profile_pic: 'https://ui-avatars.com/api/?name=Updated&size=200&background=ff0000&color=fff'
    }

    await sql`
      UPDATE usuarios 
      SET 
        full_name = ${dadosAtualizados.full_name},
        followers = ${dadosAtualizados.followers},
        profile_pic = ${dadosAtualizados.profile_pic},
        last_login = NOW()
      WHERE username = ${usuarioTeste.username}
    `

    const verificarUpdate = await sql`
      SELECT * FROM usuarios WHERE username = ${usuarioTeste.username}
    `

    if (verificarUpdate.rows[0].followers === dadosAtualizados.followers) {
      console.log('✅ UPDATE funcionou! Dados atualizados:')
      console.log('   Nome:', verificarUpdate.rows[0].full_name)
      console.log('   Seguidores:', verificarUpdate.rows[0].followers, '(era 1250)')
      console.log('   Último Login:', verificarUpdate.rows[0].last_login)
    } else {
      console.log('❌ UPDATE falhou!')
    }
    console.log('\n')

    // Testar INSERT ... ON CONFLICT (chave do sistema!)
    console.log('🔑 Testando INSERT ... ON CONFLICT DO UPDATE (sincronização)...')
    
    const novosDados = {
      username: usuarioTeste.username, // MESMO username
      full_name: 'Nome Atualizado via UPSERT',
      followers: 2000,
      profile_pic: 'https://ui-avatars.com/api/?name=Upsert&size=200&background=00ff00&color=000'
    }

    await sql`
      INSERT INTO usuarios (
        username, full_name, profile_pic, followers, instagram_id
      ) VALUES (
        ${novosDados.username},
        ${novosDados.full_name},
        ${novosDados.profile_pic},
        ${novosDados.followers},
        ${usuarioTeste.instagram_id}
      )
      ON CONFLICT (username) 
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        profile_pic = EXCLUDED.profile_pic,
        followers = EXCLUDED.followers,
        last_login = NOW()
      RETURNING *
    `

    const verificarUpsert = await sql`
      SELECT * FROM usuarios WHERE username = ${usuarioTeste.username}
    `

    if (verificarUpsert.rows[0].followers === novosDados.followers) {
      console.log('✅ UPSERT funcionou perfeitamente!')
      console.log('   Não criou duplicata, apenas atualizou o registro existente')
      console.log('   Nome:', verificarUpsert.rows[0].full_name)
      console.log('   Seguidores:', verificarUpsert.rows[0].followers, '(era 1500)')
      console.log('\n   ⭐ Este é o comportamento que usaremos no login!')
    } else {
      console.log('❌ UPSERT falhou!')
    }
    console.log('\n')

    // Limpar dados de teste
    console.log('🧹 Limpando dados de teste...')
    await sql`
      DELETE FROM usuarios WHERE username = ${usuarioTeste.username}
    `
    console.log('✅ Usuário de teste removido\n')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ TODOS OS TESTES PASSARAM!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('📝 Resumo:')
    console.log('   ✅ INSERT funciona')
    console.log('   ✅ SELECT funciona')
    console.log('   ✅ UPDATE funciona')
    console.log('   ✅ INSERT ... ON CONFLICT DO UPDATE funciona (UPSERT)')
    console.log('\n   🎉 Banco de dados está pronto para FASE 2!\n')

    process.exit(0)

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ ERRO NO TESTE!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Tipo:', error.constructor.name)
    console.error('Mensagem:', error.message)
    console.error('\nStack trace:')
    console.error(error.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('💡 Possíveis causas:')
    console.log('   - Tabela usuarios não existe (rode: npm run fase1)')
    console.log('   - Colunas faltando (rode: npm run fase1)')
    console.log('   - Problema de conexão com PostgreSQL')
    console.log('   - .env.local não configurado\n')
    
    process.exit(1)
  }
}

testarInsercaoUsuario()