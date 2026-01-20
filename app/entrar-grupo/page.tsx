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
      // ✅ EXTRAÇÃO INTELIGENTE DO ID
      const groupId = extractGroupId(groupInput.trim())
      
      if (!groupId) {
        setError('Link inválido. O código deve começar com "G-"')
        setIsLoading(false)
        return
      }

      console.log('🔍 ID Extraído:', groupId)

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
          
          // === LÓGICA NOVA AQUI ===
          const savedProfile = localStorage.getItem('userProfile')
          
          if (savedProfile) {
             // Se já está logado, vai direto pro grupo
             router.push(`/grupo/${groupId}`)
          } else {
             // Se NÃO está logado, vai pro Login mas com visual personalizado
             localStorage.setItem('redirectAfterLogin', `/grupo/${groupId}`)
             
             // Cria parametros para a tela de login saber que é um convite
             const params = new URLSearchParams({
                context: 'join',
                gName: data.group.name,
                gEmoji: data.group.icon.emoji
             })
             
             router.push(`/login?${params.toString()}`)
          }
          
        } else {
          setError('Grupo não encontrado')
        }
      } else if (response.status === 404) {
        setError('Grupo não encontrado ou não existe mais')
      } else {
        setError('Erro ao buscar grupo. Tente novamente.')
      }

    } catch (err) {
      console.error('❌ Erro de conexão:', err)
      setError('Erro de conexão. Verifique sua internet.')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ FUNÇÃO BLINDADA PARA EXTRAIR ID
  const extractGroupId = (input: string): string | null => {
    const idPattern = /(G-\d+-[a-zA-Z0-9]+)/i
    const match = input.match(idPattern)
    if (match) return match[1] 

    if (input.includes('/grupo/')) {
      const parts = input.split('/grupo/')
      const potentialId = parts[1]?.split('?')[0]?.split('#')[0]
      if (potentialId && potentialId.startsWith('G-')) return potentialId
    }

    if (input.trim().startsWith('G-')) {
      return input.trim()
    }

    return null
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('G-')) {
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
                  setError('')
                }}
                onPaste={handlePaste}
                placeholder="Cole o link (instadogrupo.com.br/...)"
                className="input"
                autoFocus
                disabled={isLoading}
              />
              <div className="input-hint">
                Aceita links do Vercel, Localhost e InstaDoGrupo
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
              1. Peça o link do grupo para um amigo<br/>
              2. Cole no campo acima (não importa o domínio)<br/>
              3. Clique em "Acessar Grupo"<br/>
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
        </div>
      </div>
    </div>
  )
}