'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../globals.css'

export default function EntrarGrupoPage() {
  const router = useRouter()
  const [groupInput, setGroupInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!groupInput.trim()) {
      setError('Digite o código ou link do grupo')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // ✅ EXTRAIR ID DO GRUPO (suporta código OU link completo)
      const groupId = extractGroupId(groupInput.trim())
      
      if (!groupId) {
        setError('Código ou link inválido')
        setIsLoading(false)
        return
      }

      console.log('🔍 Buscando grupo:', groupId)

      // ✅ BUSCAR NO POSTGRESQL VIA API
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/grupos/${groupId}?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.group) {
          console.log('✅ Grupo encontrado:', data.group.name)
          
          // ✅ REDIRECIONAR PARA PÁGINA DO GRUPO
          // A página do grupo já tem a lógica de:
          // - Mostrar membros se usuário logado
          // - Pedir login se não estiver logado
          // - Permitir entrar no grupo
          router.push(`/grupo/${groupId}`)
        } else {
          setError('Grupo não encontrado')
        }
      } else if (response.status === 404) {
        setError('Grupo não encontrado ou não existe mais')
      } else {
        setError('Erro ao buscar grupo. Tente novamente.')
      }

    } catch (err) {
      console.error('❌ Erro ao buscar grupo:', err)
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ FUNÇÃO PARA EXTRAIR ID DO GRUPO
  // Suporta:
  // - Código direto: "G-1234567890-abc123"
  // - Link completo: "https://seu-app.vercel.app/grupo/G-1234567890-abc123"
  // - Link relativo: "/grupo/G-1234567890-abc123"
  const extractGroupId = (input: string): string | null => {
    // Remover espaços
    input = input.trim()

    // Se for um link (contém "/grupo/")
    if (input.includes('/grupo/')) {
      const match = input.match(/\/grupo\/([^/?&#]+)/)
      return match ? match[1] : null
    }

    // Se começar com "G-" é um código direto
    if (input.startsWith('G-')) {
      return input
    }

    return null
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    // Permitir paste de links longos
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('/grupo/')) {
      setGroupInput(pastedText)
      setError('')
    }
  }

  return (
    <div className="container">
      <div className="card create-group-card">
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span>
          <span>Voltar</span>
        </Link>

        <div className="header">
          <div className="logo create-logo">
            <div className="logo-inner">🔗</div>
          </div>
          <h1>Entrar em um Grupo</h1>
          <p className="subtitle">Cole o link ou código do grupo para participar</p>
        </div>

        <div className="create-group-content">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="group-input">
                <span className="label-icon">🔑</span>
                Link ou Código do Grupo
              </label>
              <input
                type="text"
                id="group-input"
                value={groupInput}
                onChange={(e) => {
                  setGroupInput(e.target.value)
                  setError('') // Limpar erro ao digitar
                }}
                onPaste={handlePaste}
                placeholder="Cole o link completo ou o código do grupo"
                className="input"
                autoFocus
                disabled={isLoading}
              />
              <div className="input-hint">
                Exemplo: https://seu-app.vercel.app/grupo/G-123456...
              </div>
            </div>

            {error && (
              <div className="error">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              className={`btn ${groupInput.trim() ? 'btn-primary' : 'btn-disabled'}`}
              disabled={!groupInput.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn-icon">⏳</span>
                  <span>Buscando grupo...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  <span>Acessar Grupo</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="info-box" style={{ marginTop: '32px' }}>
            <strong>💡 Como funciona:</strong>
            <p>
              1. Peça o link ou código do grupo para um membro<br/>
              2. Cole no campo acima (aceita link completo)<br/>
              3. Clique em "Acessar Grupo"<br/>
              4. Você verá os membros e poderá entrar no grupo
            </p>
          </div>

          <div className="info-box" style={{ marginTop: '16px', background: 'rgba(0, 191, 255, 0.03)' }}>
            <strong>🔐 Sobre Login:</strong>
            <p>
              • <strong>Se estiver logado:</strong> Pode ver membros e entrar imediatamente<br/>
              • <strong>Se não estiver logado:</strong> O sistema pedirá seu @username<br/>
              • Você será redirecionado de volta após fazer login
            </p>
          </div>

          <div className="info-box" style={{ marginTop: '16px', background: 'rgba(255, 215, 0, 0.05)', borderColor: 'rgba(255, 215, 0, 0.3)' }}>
            <strong style={{ color: '#FFD700' }}>✨ Não tem um link?</strong>
            <p>
              Crie seu próprio grupo clicando no botão abaixo!
            </p>
            <Link href="/criar-grupo" className="btn btn-secondary" style={{ marginTop: '16px' }}>
              <span className="btn-icon">➕</span>
              <span>Criar Novo Grupo</span>
            </Link>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: '12px', 
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              Formatos Aceitos:
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(0, 191, 255, 0.05)',
                border: '1px solid rgba(0, 191, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <span style={{ fontSize: '16px' }}>🔗</span>
                <span>Link completo: https://seu-app.vercel.app/grupo/G-...</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: 'rgba(0, 191, 255, 0.05)',
                border: '1px solid rgba(0, 191, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <span style={{ fontSize: '16px' }}>📋</span>
                <span>Código: G-1234567890-abc123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}