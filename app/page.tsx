'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import './globals.css'

interface UserProfile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  isVerified: boolean
}

interface Group {
  id: string
  name: string
  icon: {
    emoji: string
    name: string
  }
  memberCount: number
  members?: { username: string }[] 
}

export default function Home() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ✅ Busca garantida sem cache
  const loadUserGroups = useCallback(async (username: string) => {
    try {
      setIsLoading(true)
      console.log('🔍 Buscando grupos atualizados...')
      
      // Timestamp força o navegador a fazer uma nova requisição
      const timestamp = new Date().getTime()
      
      const response = await fetch(`/api/grupos/meus-grupos?username=${encodeURIComponent(username)}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.groups) {
          console.log(`✅ ${data.groups.length} grupos carregados do servidor`)
          
          // Substitui completamente a lista (sem merge perigoso)
          setUserGroups(data.groups)
          
          // Atualiza backup local
          localStorage.setItem('groups', JSON.stringify(data.groups))
        } else {
          setUserGroups([])
          localStorage.removeItem('groups')
        }
      } else {
        // Se a API falhar, limpa para não mostrar dados falsos
        console.error('❌ Falha na API')
        setUserGroups([]) 
      }
    } catch (error) {
      console.error('❌ Erro de rede:', error)
      setUserGroups([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile')
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        setUserProfile(profile)
        loadUserGroups(profile.username)
      } catch (error) {
        console.error('Erro ao ler perfil:', error)
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [loadUserGroups])

  // ✅ Função de Sair com feedback imediato
  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (!userProfile) return

    if (!window.confirm(`Tem certeza que deseja sair do grupo "${groupName}"?`)) {
      return
    }

    // 1. Remove VISUALMENTE agora (Optimistic UI)
    // Isso faz o grupo sumir instantaneamente para o usuário não ficar confuso
    setUserGroups(prev => prev.filter(g => g.id !== groupId))

    try {
      const response = await fetch('/api/grupos/sair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId,
          username: userProfile.username
        })
      })

      const data = await response.json()

      // Se deu erro, revertemos (opcional, mas seguro) ou mostramos alerta
      if (!response.ok) {
        // Se o erro for "não encontrado", tudo bem, já saiu. Se for outro, avisa.
        if (!data.error?.includes('não encontrado')) {
          alert('Houve um erro ao confirmar a saída. Recarregue a página.')
        }
      } else {
        if (data.groupDeleted) {
          alert('🗑️ Você era o último membro. O grupo foi deletado.')
        } else {
          // Sucesso silencioso ou alerta rápido
          // alert('✅ Saiu com sucesso!') 
        }
        
        // Atualiza o localStorage para refletir a saída
        const currentGroups = JSON.parse(localStorage.getItem('groups') || '[]')
        const updatedGroups = currentGroups.filter((g: Group) => g.id !== groupId)
        localStorage.setItem('groups', JSON.stringify(updatedGroups))
      }

    } catch (error) {
      console.error('Erro ao sair:', error)
      alert('Erro de conexão ao tentar sair do grupo.')
    }
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header do Usuário */}
        <div className="user-header-actions">
          {userProfile ? (
            <div className="user-info-display">
              <span className="user-handle">@{userProfile.username}</span>
              <button
                onClick={() => {
                  localStorage.removeItem('userProfile')
                  localStorage.removeItem('groups')
                  setUserProfile(null)
                  setUserGroups([])
                }}
                className="btn-login btn-sm"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-login">
              Entrar
            </Link>
          )}
        </div>

        <div className="header">
          <div className="logo">⚡</div>
          <h1>Grupo do Insta</h1>
        </div>

        <div className="welcome-content">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Crie Grupos</h3>
              <p>Monte grupos personalizados e veja o alcance total.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Métricas</h3>
              <p>Acompanhe o crescimento em tempo real.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Compartilhe</h3>
              <p>Expanda o alcance do seu grupo.</p>
            </div>
          </div>

          <div className="action-buttons">
            <Link href="/criar-grupo" className="btn btn-primary">
              <span className="btn-icon">➕</span> Criar Grupo
            </Link>
            
            <Link href="/entrar-grupo" className="btn btn-secondary">
              <span className="btn-icon">🔗</span> Entrar em Grupo
            </Link>
          </div>

          {userProfile && (
            <div className="user-groups-section">
              <h2 className="section-title">
                <span className="title-icon">📂</span> Seus Grupos
              </h2>

              {isLoading ? (
                <div className="loading-state">
                  <div className="mini-spinner"></div>
                  <p>Carregando...</p>
                </div>
              ) : userGroups.length > 0 ? (
                <div className="groups-grid">
                  {userGroups.map((group) => (
                    <div key={group.id} className="group-card-wrapper">
                      <Link href={`/grupo/${group.id}`} className="group-card">
                        <div className="group-icon-large">
                          {group.icon?.emoji || '📁'}
                        </div>
                        <div className="group-card-info">
                          <h3 className="group-card-name">{group.name}</h3>
                          <p className="group-card-members">
                            👥 {group.memberCount} membros
                          </p>
                        </div>
                        <div className="group-card-arrow">→</div>
                      </Link>
                      
                      <button
                        className="btn-leave-group"
                        onClick={(e) => {
                          e.preventDefault() // Impede de abrir o link
                          handleLeaveGroup(group.id, group.name)
                        }}
                        title="Sair do grupo"
                      >
                        🚪
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p className="empty-text">Você não está em nenhum grupo</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}