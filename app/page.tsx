'use client'

import { useState, useEffect, useCallback } from 'react'
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
  slug?: string
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
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null)
  const [leaveModalGroup, setLeaveModalGroup] = useState<Group | null>(null)
  
  // Estados de Edição
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')

  const getGroupIdentifier = (group: Group): string => {
    return group.slug || group.id
  }

  // Detecção de clique fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.group-menu-container')) {
        setOpenMenuId(null)
        setCopiedGroupId(null) 
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadUserGroups = useCallback(async (username: string) => {
    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/grupos/meus-grupos?username=${encodeURIComponent(username)}&_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache, no-store, must-revalidate' }
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
      console.error('❌ Erro:', error)
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
      router.push('/criar-grupo')
      setIsLoading(false)
    }
  }, [loadUserGroups, router])

  const handleLogout = () => {
    localStorage.removeItem('userProfile')
    localStorage.removeItem('groups')
    setUserProfile(null)
    setUserGroups([])
    router.push('/criar-grupo')
  }

  // ✅ COPIAR LINK
  const handleShareGroup = (group: Group) => {
    const identifier = getGroupIdentifier(group)
    const link = `${window.location.origin}/grupo/${identifier}`
    const message = `🚀 Olá! Entre no meu grupo "${group.name}" no Instagram!\n\n${link}\n\n👥 Já somos ${group.memberCount} membros!`
    
    navigator.clipboard.writeText(message).then(() => {
        setCopiedGroupId(identifier)
        setTimeout(() => {
          setCopiedGroupId(null)
          setOpenMenuId(null)
        }, 2000)
    }).catch(() => {
        alert('Erro ao copiar link')
    })
  }

  // ✅ MODAL SAIR
  const openLeaveModal = (group: Group) => {
    setOpenMenuId(null) 
    setLeaveModalGroup(group) 
  }

  const confirmLeaveGroup = async () => {
    if (!userProfile || !leaveModalGroup) return
    
    const group = leaveModalGroup
    const identifier = getGroupIdentifier(group)

    try {
      setIsActionLoading(true)
      const response = await fetch('/api/grupos/sair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: identifier, username: userProfile.username })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao sair')

      setUserGroups(prev => prev.filter(g => getGroupIdentifier(g) !== identifier))
      await loadUserGroups(userProfile.username)
      setLeaveModalGroup(null)
      
    } catch (error) {
      alert('Erro ao sair do grupo.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleStartEditName = (group: Group) => {
    const identifier = getGroupIdentifier(group)
    setEditingGroupId(identifier)
    setNewGroupName(group.name)
    setOpenMenuId(null)
  }

  const handleSaveGroupName = async (group: Group) => {
    if (!newGroupName.trim()) {
      alert('Digite um nome')
      return
    }
    const identifier = getGroupIdentifier(group)
    setIsActionLoading(true)

    try {
      const response = await fetch('/api/grupos/editar-nome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: identifier, newName: newGroupName.trim() })
      })

      if (!response.ok) throw new Error('Erro ao editar')

      setUserGroups(prev => prev.map(g => 
        getGroupIdentifier(g) === identifier ? { ...g, name: newGroupName.trim() } : g
      ))
      setEditingGroupId(null)
      setNewGroupName('')
    } catch (error) {
      alert('Erro ao editar nome')
    } finally {
      setIsActionLoading(false)
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

  if (!userProfile && !isLoading) return null 

  return (
    <div className="container">
      {/* ✨ MODAL SAIR - OTIMIZADO MOBILE */}
      {leaveModalGroup && (
        <div className="modal-overlay" style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', 
          zIndex: 9999,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#1a1a1a', 
            padding: '20px 16px', 
            borderRadius: '16px',
            width: '100%',
            maxWidth: 'min(340px, 90vw)',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)', 
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>😢</div>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              color: '#fff', 
              fontSize: '18px',
              fontWeight: '700'
            }}>
              Sair do grupo?
            </h3>
            <p style={{ 
              color: '#aaa', 
              fontSize: '14px', 
              marginBottom: '20px',
              lineHeight: '1.5',
              wordBreak: 'break-word'
            }}>
              Tem certeza que deseja sair do grupo <strong style={{color: '#fff'}}>{leaveModalGroup.name}</strong>?
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              flexDirection: 'column',
              width: '100%'
            }}>
              <button 
                onClick={confirmLeaveGroup}
                disabled={isActionLoading}
                style={{
                  backgroundColor: '#ff4444', 
                  color: 'white', 
                  border: 'none',
                  padding: '14px', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  opacity: isActionLoading ? 0.7 : 1,
                  fontSize: '15px',
                  minHeight: '48px',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
              >
                {isActionLoading ? 'Saindo...' : 'Sim, quero sair'}
              </button>
              <button 
                onClick={() => setLeaveModalGroup(null)}
                disabled={isActionLoading}
                style={{
                  backgroundColor: 'transparent', 
                  color: '#fff', 
                  border: '1px solid #333',
                  padding: '14px', 
                  borderRadius: '10px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  fontSize: '15px',
                  minHeight: '48px',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {/* Header Actions - OTIMIZADO MOBILE */}
        <div className="user-header-actions" style={{
          padding: '0 10px'
        }}>
            <div className="user-info-display" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              width: '100%'
            }}>
              <span className="user-handle" style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0
              }}>
                @{userProfile?.username}
              </span>
              <button 
                onClick={handleLogout} 
                className="btn-login btn-sm"
                style={{
                  minHeight: '36px',
                  minWidth: '60px',
                  flexShrink: 0
                }}
              >
                Sair
              </button>
            </div>
        </div>

        <div className="header">
          <div className="logo">⚡</div>
          <h1>Grupo do Insta</h1>
          <p className="subtitle">Bem-vindo, @{userProfile?.username}!</p>
        </div>

        <div className="welcome-content" style={{padding: '0 10px'}}>
            <div className="action-hero" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* 🟢 BOTÃO VERDE - CRIAR GRUPO */}
              <Link 
                href="/criar-grupo" 
                className="btn btn-primary btn-hero"
                style={{
                  background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                  color: '#000',
                  fontWeight: '800',
                  minHeight: '54px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                  border: 'none',
                  fontSize: '16px',
                  textDecoration: 'none'
                }}
              >
                <span>➕ Criar Novo Grupo</span>
              </Link>

              <Link 
                href="/entrar-grupo" 
                className="btn btn-secondary"
                style={{
                  minHeight: '54px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  fontSize: '16px',
                  textDecoration: 'none'
                }}
              >
                <span>🔗 Entrar em Grupo</span>
              </Link>
            </div>

            <div className="user-groups-section" style={{
              marginTop: '30px'
            }}>
              <h2 className="section-title" style={{
                fontSize: '18px',
                marginBottom: '16px'
              }}>
                📂 Seus Grupos
              </h2>

              {isLoading ? (
                <div className="loading-state">
                  <div className="mini-spinner"></div>
                  <p>Carregando...</p>
                </div>
              ) : userGroups.length > 0 ? (
                <div className="groups-grid" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  width: '100%'
                }}>
                  {userGroups.map((group) => {
                    const identifier = getGroupIdentifier(group)
                    const isEditing = editingGroupId === identifier
                    const isCopied = copiedGroupId === identifier
                    
                    return (
                      <div key={identifier} className="group-card-wrapper" style={{
                        width: '100%'
                      }}>
                        {isEditing ? (
                          <div className="group-card-editing" style={{
                            padding: '12px',
                            background: 'rgba(0, 191, 255, 0.05)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 191, 255, 0.2)'
                          }}>
                            <div className="edit-name-form" style={{
                              display: 'flex',
                              gap: '8px',
                              alignItems: 'center'
                            }}>
                              <input 
                                type="text" 
                                value={newGroupName} 
                                onChange={(e) => setNewGroupName(e.target.value)} 
                                className="input-edit-name" 
                                autoFocus 
                                disabled={isActionLoading}
                                style={{
                                  flex: 1,
                                  minHeight: '44px',
                                  fontSize: '16px',
                                  padding: '0 12px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(0, 191, 255, 0.3)',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  color: '#fff'
                                }}
                              />
                              <div className="edit-actions" style={{
                                display: 'flex',
                                gap: '6px'
                              }}>
                                <button 
                                  className="btn-save-edit" 
                                  onClick={() => handleSaveGroupName(group)} 
                                  disabled={isActionLoading}
                                  style={{
                                    minWidth: '44px',
                                    minHeight: '44px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#00ff88',
                                    color: '#000',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ✓
                                </button>
                                <button 
                                  className="btn-cancel-edit" 
                                  onClick={handleCancelEdit} 
                                  disabled={isActionLoading}
                                  style={{
                                    minWidth: '44px',
                                    minHeight: '44px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '8px',
                                    border: '1px solid #333',
                                    background: 'transparent',
                                    color: '#fff',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Link 
                              href={`/grupo/${identifier}`} 
                              className="group-card"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                minHeight: '72px',
                                textDecoration: 'none',
                                width: '100%'
                              }}
                            >
                              <div className="group-icon-large" style={{
                                fontSize: '32px',
                                flexShrink: 0,
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {group.icon?.emoji || '📁'}
                              </div>
                              <div className="group-card-info" style={{
                                flex: 1,
                                minWidth: 0
                              }}>
                                <h3 className="group-card-name" style={{
                                  margin: 0,
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {group.name}
                                </h3>
                                <p className="group-card-members" style={{
                                  margin: '4px 0 0 0',
                                  fontSize: '13px',
                                  color: '#888'
                                }}>
                                  👥 {group.memberCount} membros
                                </p>
                              </div>
                              <div className="group-card-arrow" style={{
                                fontSize: '20px',
                                color: '#00bfff',
                                flexShrink: 0
                              }}>
                                →
                              </div>
                            </Link>

                            <div className="group-menu-container" style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              zIndex: 10
                            }}>
                              <button
                                className="btn-group-menu"
                                onClick={(e) => {
                                  e.preventDefault(); 
                                  e.stopPropagation()
                                  setOpenMenuId(openMenuId === identifier ? null : identifier)
                                  if (openMenuId !== identifier) setCopiedGroupId(null)
                                }}
                                style={{
                                  minWidth: '40px',
                                  minHeight: '40px',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: '#fff',
                                  fontSize: '20px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                ⋮
                              </button>

                              {openMenuId === identifier && (
                                <div className="group-dropdown-menu" style={{ 
                                  position: 'absolute',
                                  bottom: '100%', 
                                  top: 'auto', 
                                  right: 0, 
                                  marginBottom: '8px', 
                                  zIndex: 100, 
                                  boxShadow: '0 -4px 20px rgba(0,0,0,0.3)', 
                                  padding: '8px 0', 
                                  minWidth: '180px',
                                  maxWidth: 'calc(100vw - 40px)',
                                  background: '#1a1a1a',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '12px'
                                }}>
                                  {isCopied ? (
                                    <div style={{ 
                                      padding: '14px', 
                                      textAlign: 'center', 
                                      color: '#4ade80', 
                                      fontWeight: 'bold', 
                                      fontSize: '14px', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      gap: '8px',
                                      minHeight: '48px'
                                    }}>
                                      <span>Link Copiado!</span><span>✅</span>
                                    </div>
                                  ) : (
                                    <>
                                      <button 
                                        className="menu-item menu-item-share" 
                                        onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          handleShareGroup(group) 
                                        }}
                                        style={{
                                          width: '100%',
                                          minHeight: '48px',
                                          padding: '12px 16px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#fff',
                                          fontSize: '14px',
                                          cursor: 'pointer',
                                          textAlign: 'left'
                                        }}
                                      >
                                        <span className="menu-icon">🔗</span> Copiar link
                                      </button>

                                      {isGroupAdmin(group) && (
                                        <button 
                                          className="menu-item menu-item-edit" 
                                          onClick={(e) => { 
                                            e.preventDefault(); 
                                            e.stopPropagation(); 
                                            handleStartEditName(group) 
                                          }}
                                          style={{
                                            width: '100%',
                                            minHeight: '48px',
                                            padding: '12px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#fff',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                          }}
                                        >
                                          <span className="menu-icon">✏️</span> Editar Nome
                                        </button>
                                      )}

                                      <button 
                                        className="menu-item menu-item-leave" 
                                        disabled={isActionLoading} 
                                        onClick={(e) => { 
                                          e.preventDefault(); 
                                          e.stopPropagation(); 
                                          openLeaveModal(group) 
                                        }}
                                        style={{
                                          width: '100%',
                                          minHeight: '48px',
                                          padding: '12px 16px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '10px',
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#ff4444',
                                          fontSize: '14px',
                                          cursor: 'pointer',
                                          textAlign: 'left',
                                          opacity: isActionLoading ? 0.5 : 1
                                        }}
                                      >
                                        <span className="menu-icon">🚪</span> Sair
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{
                  padding: '40px 20px',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: '#888'
                  }}>
                    Você não está em nenhum grupo
                  </p>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}