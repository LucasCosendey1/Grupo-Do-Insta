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
    console.log('🔍 Carregando grupos de:', username)
    
    // Buscar grupos do banco de dados
    const response = await fetch(`/api/grupos/meus-grupos?username=${encodeURIComponent(username)}`)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data.success && data.groups) {
        console.log('✅ Grupos encontrados no banco:', data.groups.length)
        
        setUserGroups(data.groups)
        
        // Também salvar no localStorage como backup
        const savedGroups = localStorage.getItem('groups') || '[]'
        const localGroups = JSON.parse(savedGroups)
        
        // Mesclar com grupos locais (para manter compatibilidade)
        const allGroupIds = new Set([
          ...data.groups.map((g: Group) => g.id),
          ...localGroups.map((g: any) => g.id)
        ])
        
        const mergedGroups = Array.from(allGroupIds).map(id => {
          const dbGroup = data.groups.find((g: Group) => g.id === id)
          const localGroup = localGroups.find((g: any) => g.id === id)
          return dbGroup || localGroup
        }).filter(Boolean)
        
        setUserGroups(mergedGroups)
        
      } else {
        console.log('⚠️ Nenhum grupo encontrado no banco')
        setUserGroups([])
      }
    } else {
      console.error('❌ Erro ao buscar grupos:', response.status)
      
      // Fallback para localStorage
      const savedGroups = localStorage.getItem('groups')
      if (savedGroups) {
        const groups = JSON.parse(savedGroups)
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
    }
  } catch (error) {
    console.error('❌ Erro ao carregar grupos:', error)
    setUserGroups([])
  } finally {
    setIsLoading(false)
  }
}

const handleLeaveGroup = async (groupId: string, groupName: string) => {
  if (!userProfile) return

  const confirm = window.confirm(
    `Tem certeza que deseja sair do grupo "${groupName}"?`
  )

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

    // Se grupo não existe no banco (grupo antigo do localStorage)
    if (!response.ok && data.error?.includes('não encontrado')) {
      console.log('⚠️ Grupo antigo (só no localStorage), removendo localmente...')
      
      // Remover apenas do localStorage
      const savedGroups = localStorage.getItem('groups')
      if (savedGroups) {
        const groups = JSON.parse(savedGroups)
        const updatedGroups = groups.filter((g: any) => g.id !== groupId)
        localStorage.setItem('groups', JSON.stringify(updatedGroups))
      }

      // Atualizar interface
      setUserGroups(userGroups.filter(g => g.id !== groupId))
      
      alert('✅ Você saiu do grupo!')
      return
    }

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao sair do grupo')
    }

    if (data.groupDeleted) {
      alert('🗑️ Você era o último membro. O grupo foi deletado.')
    } else {
      alert('✅ Você saiu do grupo com sucesso!')
    }

    // Remover do localStorage também
    const savedGroups = localStorage.getItem('groups')
    if (savedGroups) {
      const groups = JSON.parse(savedGroups)
      const updatedGroups = groups.filter((g: any) => g.id !== groupId)
      localStorage.setItem('groups', JSON.stringify(updatedGroups))
    }

    // Atualizar interface
    setUserGroups(userGroups.filter(g => g.id !== groupId))

  } catch (error) {
    console.error('❌ Erro ao sair do grupo:', error)
    alert('Erro ao sair do grupo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
  }
}

  return (
    <div className="container">
      <div className="card">
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
                    <div key={group.id} className="group-card-wrapper">
                      <Link
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
                      <button
                        className="btn-leave-group"
                        onClick={(e) => {
                          e.preventDefault()
                          handleLeaveGroup(group.id, group.name)
                        }}
                        title="Sair do grupo"
                      >
                        🚪 Sair
                      </button>
                    </div>
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