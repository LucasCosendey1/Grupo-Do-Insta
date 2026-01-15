'use client'

import { useState, useEffect } from 'react'
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
}

export default function Home() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Carregar perfil do usuário
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
  }, [])

  const loadUserGroups = async (username: string) => {
    try {
      setIsLoading(true)
      
      // Buscar grupos do localStorage (temporário, até migrar tudo pro DB)
      const savedGroups = localStorage.getItem('groups')
      if (savedGroups) {
        const groups = JSON.parse(savedGroups)
        
        // Filtrar grupos onde o usuário é membro
        const userGroupsList = groups
          .filter((g: any) => 
            g.members?.some((m: any) => 
              m.username?.toLowerCase() === username.toLowerCase()
            )
          )
          .map((g: any) => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            memberCount: g.members?.length || 0
          }))
        
        setUserGroups(userGroupsList)
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header com botão de login */}
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          {userProfile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                @{userProfile.username}
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem('userProfile')
                  setUserProfile(null)
                  setUserGroups([])
                }}
                className="btn-login"
                style={{ padding: '8px 16px' }}
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
              <p>Monte grupos personalizados com seus amigos e veja o alcance total do grupo</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analise Métricas</h3>
              <p>Acompanhe estatísticas e o crescimento do seu grupo em tempo real</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Compartilhe</h3>
              <p>Convide novos membros e expanda o alcance do seu grupo</p>
            </div>
          </div>

          <div className="action-buttons">
            <Link href="/criar-grupo" className="btn btn-primary">
              <span className="btn-icon">➕</span>
              Criar Grupo
            </Link>
            
            <Link href="/entrar-grupo" className="btn btn-secondary">
              <span className="btn-icon">🔗</span>
              Entrar em um Grupo
            </Link>
          </div>

          {/* SEÇÃO: GRUPOS QUE VOCÊ FAZ PARTE */}
          {userProfile && (
            <div className="user-groups-section">
              <h2 className="section-title">
                <span className="title-icon">📂</span>
                Grupos que você faz parte
              </h2>

              {isLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Carregando seus grupos...</p>
                </div>
              ) : userGroups.length > 0 ? (
                <div className="groups-grid">
                  {userGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/grupo/${group.id}`}
                      className="group-card"
                    >
                      <div className="group-icon-large">
                        {group.icon.emoji}
                      </div>
                      <div className="group-card-info">
                        <h3 className="group-card-name">{group.name}</h3>
                        <p className="group-card-members">
                          <span className="members-icon">👥</span>
                          {group.memberCount} {group.memberCount === 1 ? 'membro' : 'membros'}
                        </p>
                      </div>
                      <div className="group-card-arrow">→</div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p className="empty-text">Você ainda não faz parte de nenhum grupo</p>
                  <p className="empty-hint">Crie um novo grupo ou peça um código para entrar!</p>
                </div>
              )}
            </div>
          )}

          <div className="info-box" style={{ marginTop: '32px' }}>
            <strong>✨ Como funciona:</strong>
            <br/>
            1. Faça login com seu Instagram<br/>
            2. Crie um novo grupo ou entre em um existente<br/>
            3. Adicione membros e veja o alcance total<br/>
            4. Compartilhe com seus amigos!
          </div>
        </div>
      </div>
    </div>
  )
}