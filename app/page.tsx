'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import './globals.css'

// Interfaces
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

  // Memoizando a função para usar no useEffect sem warnings
  const loadUserGroups = useCallback(async (username: string) => {
    try {
      setIsLoading(true)
      console.log('🔍 Carregando grupos de:', username)
      
      // ✅ CORREÇÃO 1: Adicionado timestamp para evitar cache do navegador
      // ✅ CORREÇÃO 2: Adicionado headers 'no-store'
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
          const dbGroups: Group[] = data.groups 
          
          // ✅ CORREÇÃO CRÍTICA:
          // Se a API respondeu, confiamos nela! NÃO fazemos merge com localStorage antigo.
          // O merge estava trazendo de volta grupos que o usuário já tinha saído.
          setUserGroups(dbGroups)
          
          // Atualizamos o backup local com a verdade absoluta do servidor
          localStorage.setItem('groups', JSON.stringify(dbGroups))
          
        } else {
          setUserGroups([])
        }
      } else {
        // Fallback LocalStorage (Só entra aqui se a API falhar/Internet cair)
        console.error('❌ Erro API, usando local:', response.status)
        const savedGroups = localStorage.getItem('groups')
        if (savedGroups) {
          const groups: Group[] = JSON.parse(savedGroups)
          // Filtragem de segurança local
          const userGroupsList = groups.filter(g => 
            g.members?.some(m => m.username?.toLowerCase() === username.toLowerCase())
          )
          setUserGroups(userGroupsList)
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar grupos:', error)
      // Tenta recuperar do local storage em caso de erro de rede
      const savedGroups = localStorage.getItem('groups')
      if (savedGroups) {
         setUserGroups(JSON.parse(savedGroups))
      } else {
         setUserGroups([])
      }
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
        console.error('Erro ao carregar perfil:', error)
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [loadUserGroups])

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (!userProfile) return

    const confirm = window.confirm(`Tem certeza que deseja sair do grupo "${groupName}"?`)
    if (!confirm) return

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

      // Tratamento para grupo que só existe localmente
      if (!response.ok && data.error?.includes('não encontrado')) {
        removeFromLocalStorage(groupId)
        alert('✅ Você saiu do grupo (removido do local)!')
        return
      }

      if (!response.ok) throw new Error(data.error || 'Erro ao sair')

      if (data.groupDeleted) {
        alert('🗑️ Você era o último membro. O grupo foi deletado.')
      } else {
        alert('✅ Você saiu do grupo com sucesso!')
      }

      // Remove da tela e do local storage imediatamente
      removeFromLocalStorage(groupId)

      // Opcional: Recarregar a lista do servidor para garantir sincronia total
      // loadUserGroups(userProfile.username) 

    } catch (error) {
      console.error('❌ Erro ao sair do grupo:', error)
      alert('Erro ao sair do grupo.')
    }
  }

  // Função auxiliar para limpar localStorage e Estado
  const removeFromLocalStorage = (groupId: string) => {
    // 1. Atualiza visualmente agora (UI Optimistic)
    setUserGroups(prev => prev.filter(g => g.id !== groupId))

    // 2. Atualiza o "backup" local para não voltar a assombrar
    const savedGroups = localStorage.getItem('groups')
    if (savedGroups) {
      const groups: Group[] = JSON.parse(savedGroups)
      const updatedGroups = groups.filter(g => g.id !== groupId)
      localStorage.setItem('groups', JSON.stringify(updatedGroups))
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
                          e.preventDefault()
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