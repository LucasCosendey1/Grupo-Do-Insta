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

  // Função auxiliar para limpar localStorage e Estado (Movida para cima para ser usada no load)
  const removeFromLocalStorage = useCallback((groupId: string) => {
    setUserGroups(prev => prev.filter(g => g.id !== groupId))
    const savedGroups = localStorage.getItem('groups')
    if (savedGroups) {
      const groups: Group[] = JSON.parse(savedGroups)
      const updatedGroups = groups.filter((g: Group) => g.id !== groupId)
      localStorage.setItem('groups', JSON.stringify(updatedGroups))
    }
  }, [])

  const loadUserGroups = useCallback(async (username: string) => {
    try {
      setIsLoading(true)
      
      // Timestamp para ignorar cache do navegador agressivo
      const timestamp = Date.now()
      const response = await fetch(`/api/grupos/meus-grupos?username=${encodeURIComponent(username)}&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store', // Força a Vercel e o navegador a não usarem cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.groups) {
          // A API é a verdade absoluta. Substituímos o estado e o localstorage.
          const dbGroups: Group[] = data.groups 
          setUserGroups(dbGroups)
          localStorage.setItem('groups', JSON.stringify(dbGroups))
        } else {
          setUserGroups([])
          localStorage.setItem('groups', JSON.stringify([]))
        }
      } else {
        // Se a API falhar, tentamos o local storage como última opção
        const savedGroups = localStorage.getItem('groups')
        if (savedGroups) {
          setUserGroups(JSON.parse(savedGroups))
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar grupos:', error)
      const savedGroups = localStorage.getItem('groups')
      if (savedGroups) setUserGroups(JSON.parse(savedGroups))
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

    // Otimismo: remove da tela antes mesmo da resposta da API para parecer instantâneo
    const previousGroups = [...userGroups]
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

      if (response.ok) {
        // Se deu certo, removemos definitivamente do cache local
        removeFromLocalStorage(groupId)
      } else {
        // Se deu erro na API, voltamos o grupo para a tela
        setUserGroups(previousGroups)
        alert('Erro ao sair do grupo no servidor.')
      }
    } catch (error) {
      setUserGroups(previousGroups)
      console.error('❌ Erro ao sair do grupo:', error)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="user-header-actions">
          {userProfile ? (
            <div className="user-info-display">
              <span className="user-handle">@{userProfile.username}</span>
              <button
                onClick={() => {
                  localStorage.clear() // Limpa tudo ao sair
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