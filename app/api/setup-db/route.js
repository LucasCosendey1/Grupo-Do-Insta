import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// 🔥 IMPORTANTE: Força Edge Runtime ou Dynamic para não cachear
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔧 Corrigindo Banco de Dados...')

    // 1. Criar coluna updated_at se não existir
    await sql`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();
    `
    console.log('✅ Coluna updated_at criada/verificada.')

    // 2. Criar Índice
    await sql`
      CREATE INDEX IF NOT EXISTS idx_usuarios_updated_at ON usuarios (updated_at);
    `
    console.log('✅ Índice criado.')

    // 3. Forçar atualização (Envelhecer usuários)
    await sql`
      UPDATE usuarios SET updated_at = NOW() - INTERVAL '48 hours';
    `
    console.log('✅ Usuários marcados para atualização.')

    return NextResponse.json({ success: true, message: "Banco de dados corrigido com sucesso!" })
    
  } catch (error) { // <--- AQUI ESTAVA O ERRO (removi o :any)
    console.error('Erro no setup:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}