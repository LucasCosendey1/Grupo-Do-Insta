'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import '../../globals.css'

// ==========================================
// INTERFACES
// ==========================================

interface Profile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  following: number
  posts: number
  biography: string
  isPrivate: boolean
  isVerified: boolean
  isCreator?: boolean
}

interface GroupData {
  id: string
  name: string
  icon: {
    id: string
    emoji: string
    name: string
  }
  creator: string
  members: Profile[]
  createdAt: string
}

interface UserProfile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  isVerified: boolean
}

export default function GrupoPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  
  // Estados de Dados
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // Estados de UI/Loading
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)
  const [isUserMember, setIsUserMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  // Estados do Menu
  const [showMenu, setShowMenu] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copiedType, setCopiedType] = useState<'link' | 'message' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // ✅ GARANTIR QUE ESTAMOS NO CLIENTE
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ✅ VERIFICAR SE USUÁRIO ESTÁ LOGADO
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile)
          setUserProfile(profile)
        } catch (error) {
          console.error('Erro ao carregar perfil:', error)
        }
      }
    }
  }, [])

  // ✅ CARREGAR GRUPO
  useEffect(() => {
    if (!groupId) return
    
    async function loadGroup() {
      try {
        setIsLoadingGroup(true)
        console.log('🔍 Buscando grupo:', groupId)
        
        const response = await fetch(`/api/grupos/${groupId}`, { cache: 'no-store' })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Grupo não encontrado')
        }
        
        const data = await response.json()
        
        if (data.success && data.group) {
          const profilesFromDB = data.group.profiles || []
          
          setGroupData({
            id: data.group.id,
            name: data.group.name,
            icon: data.group.icon,
            creator: data.group.creator,
            members: profilesFromDB,
            createdAt: data.group.createdAt
          })
          
          setProfiles(profilesFromDB)
        } else {
          throw new Error('Resposta inválida da API')
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar grupo:', error)
      } finally {
        setIsLoadingGroup(false)
      }
    }
    
    loadGroup()
  }, [groupId])

  // ✅ VERIFICAR SE USUÁRIO É MEMBRO
  useEffect(() => {
    if (userProfile && profiles.length > 0) {
      const isMember = profiles.some(
        p => p.username.toLowerCase() === userProfile.username.toLowerCase()
      )
      setIsUserMember(isMember)
    }
  }, [userProfile, profiles])

  // ✅ FECHAR MENU AO CLICAR FORA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
        setShowShareOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // FORMATADORES
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTotalFollowers = (): number => {
    return profiles.reduce((total, profile) => total + profile.followers, 0)
  }

  // ✅ GERAR LINK SEGURO
  const getShareLink = (): string => {
    if (typeof window === 'undefined' || !groupData) return ''
    return `${window.location.origin}/grupo/${groupId}`
  }

  // ✅ COPIAR LINK (Fallback interno)
  const handleCopyLink = async () => {
    const link = getShareLink()
    if (!link) return

    try {
      await navigator.clipboard.writeText(link)
      setCopiedType('link')
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
      setTimeout(() => setCopiedType(null), 3000)
    } catch (err) {
      console.error('Falha ao copiar:', err)
      alert('Não foi possível copiar o link automaticamente.')
    }
  }

  // ✅ COPIAR MENSAGEM
  const handleCopyMessage = async () => {
    if (!groupData) return
    
    const link = getShareLink()
    const message = `🚀 Olá! Entre no meu grupo "${groupData.name}" com o seu @ do instagram!\n\n${link}\n\n👥 Já somos ${profiles.length} ${profiles.length === 1 ? 'membro' : 'membros'} com ${formatNumber(getTotalFollowers())} seguidores no total!`
    
    try {
      await navigator.clipboard.writeText(message)
      setCopiedType('message')
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
      setTimeout(() => setCopiedType(null), 3000)
    } catch (err) {
      console.error('Falha ao copiar:', err)
    }
  }

  // ✅ COMPARTILHAR NATIVO
  const handleNativeShare = async () => {
    if (!groupData) return
    
    const link = getShareLink()
    const shareData = {
      title: `Grupo: ${groupData.name}`,
      text: `🚀 Entre no meu grupo "${groupData.name}" no Instagram!`,
      url: link
    }
    
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        setShowShareOptions(false)
        setShowMenu(false)
      } catch (error) {
        console.log('Compartilhamento cancelado ou erro:', error)
      }
    } else {
      handleCopyLink()
      alert('Link copiado para a área de transferência!')
    }
  }

  // ✅ PARTICIPAR
  const handleJoinGroup = async () => {
    if (!userProfile) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname)
      router.push('/login')
      return
    }

    setIsJoining(true)

    try {
      const response = await fetch(`/api/scrape?username=${userProfile.username}`)
      const profileData = await response.json()
      
      if (!response.ok || profileData.error) {
        throw new Error(profileData.error || 'Erro ao buscar perfil')
      }

      const addResponse = await fetch('/api/grupos/adicionar-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId,
          username: userProfile.username,
          profileData: profileData
        })
      })

      const addResult = await addResponse.json()

      if (!addResponse.ok) {
        if (addResult.error?.includes('já está no grupo')) {
          alert('Você já é membro deste grupo!')
          setIsUserMember(true)
          return
        }
        throw new Error(addResult.error || 'Erro ao participar')
      }

      setProfiles(prev => {
        const filtered = prev.filter(p => p.username.toLowerCase() !== userProfile.username.toLowerCase())
        return [...filtered, { ...profileData, isCreator: false }]
      })
      
      setIsUserMember(true)
      alert('🎉 Bem-vindo ao grupo!')
      
    } catch (err) {
      alert('Erro ao participar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setIsJoining(false)
    }
  }

  // ✅ SAIR
  const handleLeaveGroup = async () => {
    if (!userProfile) return
    setShowMenu(false)

    if (!window.confirm(`Tem certeza que deseja sair do grupo "${groupData?.name}"?`)) return

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

      if (!response.ok) throw new Error(data.error || 'Erro ao sair')

      if (data.groupDeleted) {
        alert('🗑️ Você era o último membro. O grupo foi deletado.')
        router.push('/')
      } else {
        alert('✅ Você saiu do grupo!')
        setIsUserMember(false)
        setProfiles(prev => prev.filter(p => p.username.toLowerCase() !== userProfile.username.toLowerCase()))
      }

    } catch (error) {
      alert('Erro ao sair do grupo.')
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  // --- RENDERS ---

  if (!isMounted) return null

  if (!isLoadingGroup && !userProfile) {
    return (
      <div className="container">
        <div className="card grupo-card">
          <Link href="/" className="btn-back-large">
            <span className="back-arrow-large">←</span>
            <span>Voltar</span>
          </Link>
          <div className="header">
            <div className="logo">{groupData?.icon?.emoji || '⚡'}</div>
            <h1>{groupData?.name || 'Carregando...'}</h1>
            <p className="subtitle">Você precisa fazer login para acessar este grupo</p>
          </div>
          <div className="login-prompt-section">
            <div className="prompt-icon">🔐</div>
            <div className="prompt-text">Faça login para ver os membros e participar</div>
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem('redirectAfterLogin', window.location.pathname)
                router.push('/login')
              }}
            >
              <span className="btn-icon">🚀</span><span>Fazer Login</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingGroup) {
    return (
      <div className="container">
        <div className="card grupo-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando grupo...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card grupo-card">
        
        {/* === HEADER COM MENU 3 PONTINHOS === */}
        {/* CORREÇÃO: display flex com justify-content: space-between para separar os botões */}
        <div 
          className="grupo-header" 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <Link href="/" className="btn-back-large">
            <span className="back-arrow-large">←</span><span>Voltar</span>
          </Link>

          {isUserMember && (
            <div className="group-menu-top" ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="btn-menu-top"
                onClick={() => {
                  setShowMenu(!showMenu)
                  if(!showMenu) setShowShareOptions(false)
                }}
              >
                ⋮
              </button>
              
              {showMenu && (
                <div 
                  className="dropdown-menu-top"
                  // CORREÇÃO: Abre para baixo e alinhado à direita
                  style={{
                    top: '100%', 
                    right: 0,
                    marginTop: '8px',
                    zIndex: 50,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  
                  {/* BOTÃO PRINCIPAL DE COMPARTILHAR */}
                  <button
                    className="menu-item-top menu-item-share"
                    onClick={() => setShowShareOptions(!showShareOptions)}
                  >
                    <span className="menu-icon">🔗</span>
                    <span>Compartilhar</span>
                    <span className="menu-arrow">{showShareOptions ? '▼' : '▶'}</span>
                  </button>

                  {/* SUBMENU DE COMPARTILHAMENTO */}
                  {showShareOptions && (
                    <div className="share-submenu">
                      
                      {/* Opção 1: Nativo */}
                      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                        <button className="submenu-item" onClick={handleNativeShare}>
                          <span>Compartilhar grupo</span>
                        </button>
                      )}
                      
                      {/* Opção 2: Copiar Link Completo */}
                      <button className="submenu-item" onClick={handleCopyMessage}>
                        <span>
                           {copiedType === 'message' ? 'Copiado!' : 'Copiar Link'}
                        </span>
                        {copiedType === 'message' && <span className="copied-check">✓</span>}
                      </button>
                    </div>
                  )}

                  <button className="menu-item-top menu-item-leave" onClick={handleLeaveGroup}>
                    <span className="menu-icon">🚪</span>
                    <span>Sair do Grupo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INFO GRUPO */}
        <div className="header">
          <div className="logo">{groupData?.icon?.emoji || '⚡'}</div>
          <h1>{groupData?.name}</h1>
          <p className="subtitle">
            {isUserMember 
              ? `👥 ${profiles.length} ${profiles.length === 1 ? 'membro' : 'membros'}` 
              : 'Faça parte deste grupo'}
          </p>
        </div>

        {/* BOTÃO PARTICIPAR */}
        {!isUserMember && userProfile && (
          <div className="join-section">
            <button 
              className="btn btn-join"
              onClick={handleJoinGroup}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <span className="btn-icon">⏳</span><span>Participando...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">✨</span><span>Participar do Grupo</span><span className="btn-arrow">→</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ARENA E STATS */}
        {profiles.length > 0 && userProfile && (
          <div className="profiles-container">
            <div className="total-stats-mobile">
              <div className="stats-icon">📊</div>
              <div className="stats-content-mobile">
                <div className="total-number-mobile">
                  {formatNumber(getTotalFollowers())}
                </div>
                <div className="total-label-mobile">seguidores no total</div>
              </div>
            </div>

            <ProfilesArena 
              profiles={profiles}
              onImageError={handleImageError}
              onProfileClick={setSelectedProfile}
              creatorUsername={groupData?.creator || ''}
              currentUsername={userProfile?.username || ''}
              isUserMember={isUserMember}
            />
          </div>
        )}

        {/* MODAL DE PERFIL */}
        {selectedProfile && (
          <ProfileModal 
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onImageError={handleImageError}
          />
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTES AUXILIARES (Arena, MovingProfile, Modal)
// ==========================================

interface ProfilesArenaProps {
  profiles: Profile[]
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
  onProfileClick: (profile: Profile) => void
  creatorUsername: string
  currentUsername: string
  isUserMember: boolean
}

function ProfilesArena({ 
  profiles, 
  onImageError, 
  onProfileClick,
  creatorUsername,
  currentUsername,
  isUserMember
}: ProfilesArenaProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  const updatePosition = (username: string, position: { x: number; y: number }) => {
    setPositions(prev => ({ ...prev, [username]: position }))
  }

  return (
    <div className="profiles-arena">
      {profiles.map((profile) => {
        const isAdmin = profile.isCreator || false
        return (
          <MovingProfile 
            key={profile.username}
            profile={profile}
            onImageError={onImageError}
            onProfileClick={onProfileClick}
            allPositions={positions}
            updatePosition={updatePosition}
            isAdmin={isAdmin}
          />
        )
      })}
    </div>
  )
}

interface MovingProfileProps {
  profile: Profile
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
  onProfileClick: (profile: Profile) => void
  allPositions: Record<string, { x: number; y: number }>
  updatePosition: (username: string, position: { x: number; y: number }) => void
  isAdmin: boolean
}

function MovingProfile({ 
  profile, 
  onImageError, 
  onProfileClick, 
  allPositions, 
  updatePosition, 
  isAdmin
}: MovingProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ vertical: 'top', horizontal: 'center' })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isInitializedRef = useRef(false)

  const BOUNDARY_PADDING = 10 

  const calculateImageSize = (followers: number): number => {
    const MIN_SIZE = 50
    const MAX_SIZE = 120
    if (followers <= 1000) return MIN_SIZE
    if (followers >= 1000000) return MAX_SIZE
    const logMin = Math.log10(1000)
    const logMax = Math.log10(1000000)
    const logCurrent = Math.log10(followers)
    const percentage = (logCurrent - logMin) / (logMax - logMin)
    return MIN_SIZE + (MAX_SIZE - MIN_SIZE) * percentage
  }

  const imageSize = calculateImageSize(profile.followers)

  // Colisão simples
  const checkCollision = (p1: {x:number, y:number}, p2: {x:number, y:number}, s1: number, s2: number) => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dist = Math.sqrt(dx*dx + dy*dy)
    return dist < (s1 + s2)/2
  }

  // Resolver Colisão
  const resolveCollision = (myPos: {x:number, y:number}, otherPos: {x:number, y:number}, myVel: {x:number, y:number}) => {
    const dx = myPos.x - otherPos.x
    const dy = myPos.y - otherPos.y
    const dist = Math.sqrt(dx*dx + dy*dy)
    if (dist === 0) return myVel
    const nx = dx / dist
    const ny = dy / dist
    const dot = myVel.x * nx + myVel.y * ny
    return { x: myVel.x - 2 * dot * nx, y: myVel.y - 2 * dot * ny }
  }

  useEffect(() => {
    if (!containerRef.current) return
    const arena = containerRef.current.parentElement
    if (!arena) return
    
    const arenaWidth = arena.offsetWidth
    const arenaHeight = arena.offsetHeight

    if (!isInitializedRef.current) {
      const initX = BOUNDARY_PADDING + Math.random() * (arenaWidth - imageSize - BOUNDARY_PADDING * 2)
      const initY = BOUNDARY_PADDING + Math.random() * (arenaHeight - imageSize - BOUNDARY_PADDING * 2)
      setPosition({ x: initX, y: initY })
      updatePosition(profile.username, { x: initX, y: initY })

      let speed = profile.isVerified ? (1.5 + Math.random() * 1.5) : (0.2 + Math.random() * 0.4)
      const angle = Math.random() * Math.PI * 2
      velocityRef.current = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
      isInitializedRef.current = true
    }

    const animate = () => {
      if (isHovered) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      setPosition(prev => {
        let nx = prev.x + velocityRef.current.x
        let ny = prev.y + velocityRef.current.y

        if (nx <= 0 || nx >= arenaWidth - imageSize - BOUNDARY_PADDING) {
          velocityRef.current.x *= -1
          nx = Math.max(0, Math.min(nx, arenaWidth - imageSize - BOUNDARY_PADDING))
        }
        if (ny <= 0 || ny >= arenaHeight - imageSize - BOUNDARY_PADDING) {
          velocityRef.current.y *= -1
          ny = Math.max(0, Math.min(ny, arenaHeight - imageSize - BOUNDARY_PADDING))
        }

        const newPos = { x: nx, y: ny }
        // Checar colisões
        Object.entries(allPositions).forEach(([uname, opos]) => {
          if (uname !== profile.username && opos) {
            if (checkCollision(newPos, opos, imageSize, imageSize)) {
              velocityRef.current = resolveCollision(newPos, opos, velocityRef.current)
              // Empurrãozinho
              const dx = newPos.x - opos.x
              const dy = newPos.y - opos.y
              const d = Math.sqrt(dx*dx + dy*dy)
              if (d > 0) {
                const push = (imageSize - d)/2
                newPos.x += (dx/d)*push
                newPos.y += (dy/d)*push
              }
            }
          }
        })
        updatePosition(profile.username, newPos)
        return newPos
      })
      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [isHovered, allPositions, profile, imageSize, updatePosition])

  // Tooltip position logic
  useEffect(() => {
    if (!isHovered || !containerRef.current) return
    const arena = containerRef.current.parentElement
    if (!arena) return
    const w = arena.offsetWidth
    const th = 80, tw = 150
    let v = 'top', h = 'center'
    if (position.y < th) v = 'bottom'
    if (position.x < tw/2) h = 'left'
    else if (position.x > w - imageSize - tw/2) h = 'right'
    setTooltipPosition({ vertical: v, horizontal: h })
  }, [isHovered, position, imageSize])

  const getTooltipClass = () => {
    const c = ['profile-info']
    if (tooltipPosition.vertical === 'bottom') c.push('profile-info-bottom')
    if (tooltipPosition.horizontal === 'left') c.push('profile-info-left')
    else if (tooltipPosition.horizontal === 'right') c.push('profile-info-right')
    return c.join(' ')
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div 
      ref={containerRef}
      className="profile-pic-container"
      style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${imageSize}px`, height: `${imageSize}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isAdmin && <div className="admin-crown">👑</div>}
      
      {isHovered && (
        <div className={getTooltipClass()}>
          <div className="profile-username">
            @{profile.username}
            {isAdmin && <span style={{color: '#FFD700', fontWeight: 'bold', marginLeft: '6px', textShadow: '0 0 5px rgba(255,215,0,0.5)'}}>ADM</span>}
          </div>
          <div className="profile-followers">{formatNumber(profile.followers)} seguidores</div>
        </div>
      )}
      
      <img 
        src={profile.profilePic}
        alt={profile.username}
        className="profile-pic"
        onError={(e) => onImageError(e, profile.username)}
        onClick={(e) => { e.stopPropagation(); onProfileClick(profile) }}
        loading="lazy"
      />
    </div>
  )
}

interface ProfileModalProps {
  profile: Profile
  onClose: () => void
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
}

function ProfileModal({ profile, onClose, onImageError }: ProfileModalProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-header-compact">
          <img 
            src={profile.profilePic}
            alt={profile.username}
            className="modal-profile-pic-small"
            onError={(e) => onImageError(e, profile.username)}
          />
          <div className="modal-user-info">
            <div className="modal-username">
              @{profile.username} {profile.isCreator && <span style={{marginLeft: '5px'}}>👑</span>}
            </div>
            <div className="modal-fullname">{profile.fullName || profile.username}</div>
          </div>
        </div>
        <div className="modal-stats">
          <div className="stat-item"><div className="stat-number">{formatNumber(profile.posts || 0)}</div><div className="stat-label">Posts</div></div>
          <div className="stat-item"><div className="stat-number">{formatNumber(profile.followers || 0)}</div><div className="stat-label">Seguidores</div></div>
          <div className="stat-item"><div className="stat-number">{formatNumber(profile.following || 0)}</div><div className="stat-label">Seguindo</div></div>
        </div>
        <div className="modal-bio-section">
          <div className="modal-bio-label">Biografia</div>
          {profile.biography ? <div className="modal-bio-text">{profile.biography}</div> : <div className="modal-bio-empty">Nenhuma biografia disponível</div>}
        </div>
        <a href={`https://www.instagram.com/${profile.username}`} target="_blank" rel="noopener noreferrer" className="modal-link-btn">
          📸 Ver no Instagram
        </a>
      </div>
    </div>
  )
}