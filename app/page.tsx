'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  creator?: string
}

export default function Home() {
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showCopiedMessage, setShowCopiedMessage] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  // ✅ Busca garantida sem cache
  const loadUserGroups = useCallback(async (username: string) => {
    try {
      setIsLoading(true)
      console.log('🔍 Buscando grupos atualizados...')
      
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
          setUserGroups(data.groups)
          localStorage.setItem('groups', JSON.stringify(data.groups))
        } else {
          setUserGroups([])
          localStorage.removeItem('groups')
        }
      } else {
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
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [loadUserGroups])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userProfile')
    localStorage.removeItem('groups')
    setUserProfile(null)
    setUserGroups([])
  }

  // ✅ COMPARTILHAR GRUPO
  const handleShareGroup = (groupId: string, groupName: string, memberCount: number) => {
    const link = `${window.location.origin}/grupo/${groupId}`
    const message = `🚀 Olá! Entre no meu grupo "${groupName}" no Instagram!\n\n${link}\n\n👥 Já somos ${memberCount} ${memberCount === 1 ? 'membro' : 'membros'}!`
    
    navigator.clipboard.writeText(message).then(() => {
        setShowCopiedMessage(groupId)
        setTimeout(() => setShowCopiedMessage(null), 3000)
        setOpenMenuId(null)
    }).catch(err => {
        alert('Erro ao copiar link')
    })
  }

  // ✅ SAIR DO GRUPO
  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    if (!userProfile) return
    setOpenMenuId(null)
    if (!window.confirm(`Tem certeza que deseja sair do grupo "${groupName}"?`)) return

    try {
      const response = await fetch('/api/grupos/sair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: groupId, username: userProfile.username })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao sair')


      loadUserGroups(userProfile.username)
    } catch (error) {
      alert('Erro ao sair do grupo.')
    }
  }

  // ✅ EDITAR NOME DO GRUPO (ADM)
  const handleStartEditName = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId)
    setNewGroupName(currentName)
    setOpenMenuId(null)
  }

  const handleSaveGroupName = async (groupId: string) => {
    if (!newGroupName.trim()) {
      alert('Digite um nome para o grupo')
      return
    }

    try {
      const response = await fetch('/api/grupos/editar-nome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: groupId, newName: newGroupName.trim() })
      })

      if (!response.ok) throw new Error('Erro ao editar nome')

      alert('✅ Nome do grupo atualizado!')
      setUserGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newGroupName.trim() } : g))
      setEditingGroupId(null)
      setNewGroupName('')
    } catch (error) {
      alert('Erro ao editar nome')
    }
  }

  const handleCancelEdit = () => {
    setEditingGroupId(null)
    setNewGroupName('')
  }

  const isGroupAdmin = (group: Group): boolean => {
    if (!userProfile) return false
    return group.creator?.toLowerCase() === userProfile.username.toLowerCase()
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header Actions */}
        <div className="user-header-actions">
          {userProfile ? (
            <div className="user-info-display">
              <span className="user-handle">@{userProfile.username}</span>
              <button onClick={handleLogout} className="btn-login btn-sm">Sair</button>
            </div>
          ) : (
            <Link href="/login" className="btn-login">Entrar</Link>
          )}
        </div>

        <div className="header">
          <div className="logo">⚡</div>
          <h1>Grupo do Insta</h1>
          <p className="subtitle">
            {userProfile ? `Bem-vindo, @${userProfile.username}!` : 'Crie e gerencie grupos do Instagram'}
          </p>
        </div>

        <div className="welcome-content">
          {!userProfile ? (
            // ❌ LOGIN PROMPT
            <>
              <div className="features-grid">
                <div className="feature-card"><h3>👥 Crie Grupos</h3><p>Monte grupos personalizados.</p></div>
                <div className="feature-card"><h3>📊 Métricas</h3><p>Acompanhe o crescimento.</p></div>
                <div className="feature-card"><h3>🚀 Compartilhe</h3><p>Expanda o alcance.</p></div>
              </div>
              <div className="login-cta-section">
                <Link href="/login" className="btn btn-primary btn-large"><span>Entre com o seu @ do instagram</span> →</Link>
              </div>
            </>
          ) : (
            // ✅ DASHBOARD
            <>
              <div className="action-hero">
                <Link href="/criar-grupo" className="btn btn-primary btn-hero"><span>➕ Criar Novo Grupo</span></Link>
                <Link href="/entrar-grupo" className="btn btn-secondary"><span>🔗 Entrar em Grupo</span></Link>
              </div>

              <div className="user-groups-section">
                <h2 className="section-title">📂 Seus Grupos</h2>

                {isLoading ? (
                  <div className="loading-state"><div className="mini-spinner"></div><p>Carregando...</p></div>
                ) : userGroups.length > 0 ? (
                  <div className="groups-grid">
                    {userGroups.map((group) => (
                      <div key={group.id} className="group-card-wrapper">
                        {editingGroupId === group.id ? (
                          // MODO EDIÇÃO
                          <div className="group-card-editing">
                             {/* ... (mantido igual ao anterior) ... */}
                            <div className="edit-name-form">
                              <input 
                                type="text" value={newGroupName} 
                                onChange={(e) => setNewGroupName(e.target.value)} 
                                className="input-edit-name" autoFocus 
                              />
                              <div className="edit-actions">
                                <button className="btn-save-edit" onClick={() => handleSaveGroupName(group.id)}>✓</button>
                                <button className="btn-cancel-edit" onClick={handleCancelEdit}>×</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // MODO VISUALIZAÇÃO
                          <>
                            <Link href={`/grupo/${group.id}`} className="group-card">
                              <div className="group-icon-large">{group.icon?.emoji || '📁'}</div>
                              <div className="group-card-info">
                                <h3 className="group-card-name">{group.name}</h3>
                                <p className="group-card-members">👥 {group.memberCount} membros</p>
                              </div>
                              <div className="group-card-arrow">→</div>
                            </Link>

                            {/* ✅ MENU 3 PONTINHOS (VOLTOU AO ORIGINAL + MENU PRA CIMA) */}
                            <div className="group-menu-container" ref={menuRef}>
                              <button
                                className="btn-group-menu"
                                onClick={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  setOpenMenuId(openMenuId === group.id ? null : group.id)
                                }}
                              >
                                ⋮
                              </button>

                              {openMenuId === group.id && (
                                <div 
                                    className="group-dropdown-menu" 
                                    // AJUSTES DE ESTILO AQUI
                                    style={{ 
                                        bottom: '100%', // Abre para cima
                                        top: 'auto', 
                                        right: 0,
                                        marginBottom: '10px', // O ESPAÇO QUE VOCÊ PEDIU
                                        zIndex: 100,
                                        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                                        padding: '8px 0' // Espaço interno para os botões não ficarem colados na borda
                                    }}
                                >
                                  {showCopiedMessage === group.id && (
                                    <div className="copy-success-badge">✓ Copiado!</div>
                                  )}
                                  
                                  <button
                                    className="menu-item menu-item-share"
                                    onClick={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      handleShareGroup(group.id, group.name, group.memberCount)
                                    }}
                                  >
                                    <span className="menu-icon">🔗</span> Compartilhar
                                  </button>

                                  {isGroupAdmin(group) && (
                                    <button
                                      className="menu-item menu-item-edit"
                                      onClick={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        handleStartEditName(group.id, group.name)
                                      }}
                                    >
                                      <span className="menu-icon">✏️</span> Editar Nome
                                    </button>
                                  )}

                                  <button
                                    className="menu-item menu-item-leave"
                                    onClick={(e) => {
                                      e.preventDefault(); e.stopPropagation();
                                      handleLeaveGroup(group.id, group.name)
                                    }}
                                  >
                                    <span className="menu-icon">🚪</span> Sair
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><p>Você não está em nenhum grupo</p></div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}