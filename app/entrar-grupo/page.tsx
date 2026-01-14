'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../globals.css'

export default function EntrarGrupoPage() {
  const router = useRouter()
  const [groupCode, setGroupCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!groupCode.trim()) {
      setError('Digite o código do grupo')
      return
    }

    setIsLoading(true)
    setError('')

    // Simular busca de grupo
    setTimeout(() => {
      const savedGroups = localStorage.getItem('groups')
      
      if (savedGroups) {
        try {
          const groups = JSON.parse(savedGroups)
          const foundGroup = groups.find((g: any) => g.id === groupCode.trim())
          
          if (foundGroup) {
            // Redirecionar para a página do grupo
            router.push('/grupo')
          } else {
            setError('Código de grupo não encontrado')
          }
        } catch (err) {
          setError('Erro ao buscar grupo')
        }
      } else {
        setError('Nenhum grupo encontrado')
      }
      
      setIsLoading(false)
    }, 1000)
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
          <p className="subtitle">Digite o código do grupo para participar</p>
        </div>

        <div className="create-group-content">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="group-code">
                <span className="label-icon">🔑</span>
                Código do Grupo
              </label>
              <input
                type="text"
                id="group-code"
                value={groupCode}
                onChange={(e) => setGroupCode(e.target.value)}
                placeholder="Cole o código do grupo aqui"
                className="input"
                autoFocus
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="error">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              className={`btn ${groupCode.trim() ? 'btn-primary' : 'btn-disabled'}`}
              disabled={!groupCode.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="btn-icon">⏳</span>
                  <span>Buscando grupo...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  <span>Entrar no Grupo</span>
                  <span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="info-box" style={{ marginTop: '32px' }}>
            <strong>💡 Como funciona:</strong>
            <p>
              1. Peça o código do grupo para um membro<br/>
              2. Cole o código no campo acima<br/>
              3. Clique em "Entrar no Grupo" para participar
            </p>
          </div>

          <div className="info-box" style={{ marginTop: '16px', background: 'rgba(0, 191, 255, 0.03)' }}>
            <strong>✨ Não tem um código?</strong>
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