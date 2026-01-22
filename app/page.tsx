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
  
  // ✨ NOVO: Estado para controlar qual grupo está mostrando "Copiado!"
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null)

  // ✨ NOVO: Estado para o Modal de Sair (guarda o grupo que o usuário quer sair)
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
        // Se clicar fora, também resetamos o estado de "copiado" imediatamente
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
      setIsLoading(false)
    }
  }, [loadUserGroups])

  const handleLogout = () => {
    localStorage.removeItem('userProfile')
    localStorage.removeItem('groups')
    setUserProfile(null)
    setUserGroups([])
  }

  // ✅ COPIAR LINK - Lógica Melhorada
  const handleShareGroup = (group: Group) => {
    const identifier = getGroupIdentifier(group)
    const link = `${window.location.origin}/grupo/${identifier}`
    const message = `🚀 Olá! Entre no meu grupo "${group.name}" no Instagram!\n\n${link}\n\n👥 Já somos ${group.memberCount} membros!`
    
    navigator.clipboard.writeText(message).then(() => {
        // ✨ AQUI ESTÁ A MÁGICA:
        // 1. Define que este grupo foi copiado (isso vai esconder os botões no render)
        setCopiedGroupId(identifier)

        // 2. Espera 2 segundos mostrando a mensagem de sucesso e fecha tudo
        setTimeout(() => {
          setCopiedGroupId(null)
          setOpenMenuId(null)
        }, 2000)
    }).catch(() => {
        alert('Erro ao copiar link')
    })
  }

  // ✅ 1. ABRIR MODAL DE SAIR (Apenas abre o modal, não sai ainda)
  const openLeaveModal = (group: Group) => {
    setOpenMenuId(null) // Fecha o menu
    setLeaveModalGroup(group) // Abre o modal para este grupo
  }

  // ✅ 2. CONFIRMAR SAÍDA (Ação real chamada pelo Modal)
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
      
      // Fecha o modal após sucesso
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

  return (
    <div className="container">
      {/* ✨ MODAL PERSONALIZADO DE SAIR DO GRUPO */}
      {leaveModalGroup && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--card-bg, #1a1a1a)', 
            padding: '24px', 
            borderRadius: '16px',
            maxWidth: '90%', 
            width: '320px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>😢</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>Sair do grupo?</h3>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '24px' }}>
              Tem certeza que deseja sair do grupo <strong>{leaveModalGroup.name}</strong>? Você precisará ser convidado novamente para voltar.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button 
                onClick={confirmLeaveGroup}
                disabled={isActionLoading}
                style={{
                  backgroundColor: '#ff4444', color: 'white', border: 'none',
                  padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  opacity: isActionLoading ? 0.7 : 1
                }}
              >
                {isActionLoading ? 'Saindo...' : 'Sim, quero sair'}
              </button>
              <button 
                onClick={() => setLeaveModalGroup(null)}
                disabled={isActionLoading}
                style={{
                  backgroundColor: 'transparent', color: '#fff', border: '1px solid #333',
                  padding: '12px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {userGroups.map((group) => {
                      const identifier = getGroupIdentifier(group)
                      const isEditing = editingGroupId === identifier
                      // Verifica se este é o grupo onde o link foi copiado
                      const isCopied = copiedGroupId === identifier
                      
                      return (
                        <div key={identifier} className="group-card-wrapper">
                          {isEditing ? (
                            <div className="group-card-editing">
                              <div className="edit-name-form">
                                <input 
                                  type="text" 
                                  value={newGroupName} 
                                  onChange={(e) => setNewGroupName(e.target.value)} 
                                  className="input-edit-name" 
                                  autoFocus 
                                  disabled={isActionLoading}
                                />
                                <div className="edit-actions">
                                  <button className="btn-save-edit" onClick={() => handleSaveGroupName(group)} disabled={isActionLoading}>✓</button>
                                  <button className="btn-cancel-edit" onClick={handleCancelEdit} disabled={isActionLoading}>×</button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Link href={`/grupo/${identifier}`} className="group-card">
                                <div className="group-icon-large">{group.icon?.emoji || '📁'}</div>
                                <div className="group-card-info">
                                  <h3 className="group-card-name">{group.name}</h3>
                                  <p className="group-card-members">👥 {group.memberCount} membros</p>
                                </div>
                                <div className="group-card-arrow">→</div>
                              </Link>

                              <div className="group-menu-container">
                                <button
                                  className="btn-group-menu"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setOpenMenuId(openMenuId === identifier ? null : identifier)
                                    // Reseta o estado de cópia ao abrir o menu novamente
                                    if (openMenuId !== identifier) setCopiedGroupId(null)
                                  }}
                                >
                                  ⋮
                                </button>

                                {openMenuId === identifier && (
                                  <div 
                                    className="group-dropdown-menu" 
                                    style={{ 
                                        bottom: '100%',
                                        top: 'auto', 
                                        right: 0,
                                        marginBottom: '10px',
                                        zIndex: 100,
                                        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                                        padding: '8px 0',
                                        minWidth: '150px'
                                    }}
                                  >
                                    {/* ✨ LÓGICA DE EXIBIÇÃO: Se copiou, esconde botões e mostra sucesso */}
                                    {isCopied ? (
                                      <div style={{ 
                                        padding: '12px', 
                                        textAlign: 'center', 
                                        color: '#4ade80', 
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                      }}>
                                        <span>Link Copiado!</span>
                                        <span>✅</span>
                                      </div>
                                    ) : (
                                      /* Lista Normal de Botões */
                                      <>
                                        <button
                                          className="menu-item menu-item-share"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleShareGroup(group)
                                          }}
                                        >
                                          <span className="menu-icon">🔗</span> Copiar link
                                        </button>

                                        {isGroupAdmin(group) && (
                                          <button
                                            className="menu-item menu-item-edit"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              handleStartEditName(group)
                                            }}
                                          >
                                            <span className="menu-icon">✏️</span> Editar Nome
                                          </button>
                                        )}

                                        <button
                                          className="menu-item menu-item-leave"
                                          disabled={isActionLoading}
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            openLeaveModal(group) // Abre o modal em vez de confirm()
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