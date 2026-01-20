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
  
  // Estados de Dados do Grupo
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)

  // Estados do Usuário
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isUserMember, setIsUserMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  
  // Estados de Busca (Login Embutido)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Estados de UI (Menu)
  const [showMenu, setShowMenu] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copiedType, setCopiedType] = useState<'link' | 'message' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // ✅ 1. Inicialização e Verificação de Login
  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile))
        } catch (error) {
          console.error(error)
        }
      }
    }
  }, [])

  // ✅ 2. Carregar Grupo
  useEffect(() => {
    if (!groupId) return
    async function loadGroup() {
      try {
        setIsLoadingGroup(true)
        const response = await fetch(`/api/grupos/${groupId}`, { cache: 'no-store' })
        
        if (!response.ok) throw new Error('Grupo não encontrado')
        
        const data = await response.json()
        if (data.success && data.group) {
          setGroupData(data.group)
          setProfiles(data.group.profiles || [])
        }
      } catch (error) {
        console.error('Erro:', error)
      } finally {
        setIsLoadingGroup(false)
      }
    }
    loadGroup()
  }, [groupId])

  // ✅ 3. Verificar Membro
  useEffect(() => {
    if (userProfile && profiles.length > 0) {
      const isMember = profiles.some(p => p.username.toLowerCase() === userProfile.username.toLowerCase())
      setIsUserMember(isMember)
    }
  }, [userProfile, profiles])

  // ✅ 4. Lógica de Busca de Perfil (Login Embutido)
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const cleanUsername = searchTerm.replace('@', '').trim().toLowerCase()
        const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUsername)}`)
        
        if (response.ok) {
          const data = await response.json()
          // A API retorna um objeto, transformamos em array para lista
          setSearchResults([data]) 
        } else {
          setSearchResults([])
        }
      } catch (error) {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 600)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchTerm])

  // ==========================================
  // AÇÕES
  // ==========================================

  // AÇÃO: Logar e Entrar no Grupo ao mesmo tempo
  const handleLoginAndJoin = async (profileData: any) => {
    const userToSave = {
        username: profileData.username,
        fullName: profileData.fullName,
        profilePic: profileData.profilePic,
        followers: profileData.followers,
        isVerified: profileData.isVerified
    }
    localStorage.setItem('userProfile', JSON.stringify(userToSave))
    setUserProfile(userToSave)
    setSearchTerm('')
    setSearchResults([])

    setIsJoining(true)
    try {
        fetch('/api/usuarios/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        })

        const res = await fetch('/api/grupos/adicionar-membro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: groupId,
                username: profileData.username,
                profileData: profileData
            })
        })

        const result = await res.json()
        
        if (!res.ok && !result.error?.includes('já está no grupo')) {
            throw new Error(result.error)
        }

        setProfiles(prev => {
            const exists = prev.some(p => p.username.toLowerCase() === profileData.username.toLowerCase())
            if (exists) return prev
            return [...prev, { ...profileData, isCreator: false }]
        })
        setIsUserMember(true)
        alert(`Bem-vindo(a), @${profileData.username}!`)

    } catch (err) {
        alert('Login salvo, mas houve um erro ao entrar no grupo. Tente clicar em "Participar".')
    } finally {
        setIsJoining(false)
    }
  }

  // Ação para quem JÁ estava logado mas não era membro
  const handleJoinOnly = async () => {
    if (!userProfile) return
    setIsJoining(true)
    try {
        const res = await fetch(`/api/scrape?username=${userProfile.username}`)
        const data = await res.json()
        await handleLoginAndJoin(data)
    } catch (e) {
        setIsJoining(false)
        alert('Erro ao entrar.')
    }
  }

  // Sair do Grupo
  const handleLeaveGroup = async () => {
    if (!userProfile || !window.confirm('Sair do grupo?')) return
    setShowMenu(false)
    await fetch('/api/grupos/sair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, username: userProfile.username })
    })
    setIsUserMember(false)
    setProfiles(prev => prev.filter(p => p.username.toLowerCase() !== userProfile.username.toLowerCase()))
  }

  // Compartilhar
  const handleCopyMessage = () => {
    const link = `${window.location.origin}/grupo/${groupId}`
    const msg = `🚀 Entre no grupo "${groupData?.name}"!\n${link}`
    navigator.clipboard.writeText(msg)
    setCopiedType('message')
    setTimeout(() => setCopiedType(null), 2000)
  }

  const handleNativeShare = async () => {
    if (typeof navigator.share === 'function' && groupData) {
        navigator.share({ title: groupData.name, url: `${window.location.origin}/grupo/${groupId}` })
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTotalFollowers = () => profiles.reduce((total, p) => total + p.followers, 0)

  // --- RENDERS ---

  if (!isMounted) return null

  if (isLoadingGroup) {
    return <div className="container"><div className="card grupo-card"><div className="loading-state"><div className="spinner"></div><p>Carregando...</p></div></div></div>
  }

  return (
    <div className="container">
      <div className="card grupo-card">
        
        {/* HEADER */}
        <div className="grupo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Link href="/" className="btn-back-large">
            <span className="back-arrow-large">←</span><span>Voltar</span>
          </Link>

          {isUserMember && (
            <div className="group-menu-top" ref={menuRef} style={{ position: 'relative' }}>
              <button className="btn-menu-top" onClick={() => setShowMenu(!showMenu)}>⋮</button>
              {showMenu && (
                <div className="dropdown-menu-top" style={{ top: '100%', right: 0, marginTop: '8px', zIndex: 50 }}>
                  <button className="menu-item-top" onClick={() => setShowShareOptions(!showShareOptions)}>
                    🔗 Compartilhar {showShareOptions ? '▼' : '▶'}
                  </button>
                  {showShareOptions && (
                    <div className="share-submenu">
                       {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                         <button className="submenu-item" onClick={handleNativeShare}>Compartilhar</button>
                       )}
                       <button className="submenu-item" onClick={handleCopyMessage}>
                         {copiedType === 'message' ? 'Copiado!' : 'Copiar Link'}
                       </button>
                    </div>
                  )}
                  <button className="menu-item-top menu-item-leave" onClick={handleLeaveGroup}>🚪 Sair</button>
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
             {isUserMember ? `👥 ${profiles.length} membros` : 'Para entrar, informe seu Instagram:'}
          </p>
        </div>

        {/* ================================================================= */}
        {/* 🚀 ÁREA DE LOGIN EMBUTIDO (Aparece se não tiver usuário logado) */}
        {/* ================================================================= */}
        {!userProfile && (
            <div className="login-embedded-container" style={{ marginBottom: 20 }}>
                <div className="input-group" style={{ position: 'relative' }}>
                    <div className="input-wrapper">
                        <span className="input-prefix" style={{position:'absolute', left:15, top:12, fontSize:18, color:'#666'}}>@</span>
                        <input 
                            className="input" 
                            style={{paddingLeft: 35}}
                            placeholder="seu_usuario_insta"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                         {isSearching && (
                            <div className="mini-spinner" style={{position:'absolute', right:15, top:12, width:20, height:20}}></div>
                        )}
                    </div>

                    {/* LISTA DE RESULTADOS DA BUSCA */}
                    {searchResults.length > 0 && (
                        <div className="search-results-dropdown" style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            background: '#1a1a1a', 
                            border: '1px solid #333',
                            borderRadius: 8,
                            zIndex: 10,
                            marginTop: 5
                        }}>
                            {searchResults.map(p => (
                                <div 
                                    key={p.username} 
                                    className="search-result-item"
                                    style={{ padding: 10, display:'flex', alignItems:'center', gap: 10, cursor:'pointer', borderBottom:'1px solid #333' }}
                                    onClick={() => handleLoginAndJoin(p)}
                                >
                                    <img src={p.profilePic} style={{width:35, height:35, borderRadius:'50%'}} onError={(e) => handleImageError(e, p.username)}/>
                                    <div style={{flex:1}}>
                                        <div style={{fontWeight:'bold', fontSize:14}}>@{p.username}</div>
                                        <div style={{fontSize:12, color:'#888'}}>{p.fullName}</div>
                                    </div>
                                    <div style={{fontSize:12, color:'#4CAF50'}}>Entrar →</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {isJoining && <p style={{textAlign:'center', fontSize:12, color:'#888', marginTop:5}}>Entrando...</p>}
            </div>
        )}

        {/* BOTÃO PARTICIPAR (Se já logado, mas não membro) */}
        {userProfile && !isUserMember && (
          <div className="join-section">
             <div style={{textAlign:'center', marginBottom:15, fontSize:14, color:'#aaa'}}>
                Você está logado como <strong style={{color:'#fff'}}>@{userProfile.username}</strong>
             </div>
             <button className="btn btn-join" onClick={handleJoinOnly} disabled={isJoining}>
               {isJoining ? '⏳ Entrando...' : '✨ Entrar no Grupo'}
             </button>
             <button 
                className="btn-link" 
                style={{display:'block', margin:'10px auto', background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:12}}
                onClick={() => {
                    localStorage.removeItem('userProfile')
                    setUserProfile(null)
                }}
             >
                Trocar de conta
             </button>
          </div>
        )}

        {/* ARENA E STATS (Só mostra se for membro) */}
        {isUserMember && profiles.length > 0 && (
          <div className="profiles-container">
            <div className="total-stats-mobile">
              <div className="stats-icon">📊</div>
              <div className="stats-content-mobile">
                <div className="total-number-mobile">{formatNumber(getTotalFollowers())}</div>
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
// ARENA & FÍSICA (CÓDIGO DE REFERÊNCIA FIEL)
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
    setPositions(prev => ({
      ...prev,
      [username]: position
    }))
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

  // ✅ CONSTANTE DE SEGURANÇA PARA AS BORDAS
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

  // Funções de Colisão
  const checkCollision = (
    pos1: { x: number; y: number }, 
    pos2: { x: number; y: number }, 
    size1: number, 
    size2: number
  ): boolean => {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const minDistance = (size1 + size2) / 2
    return distance < minDistance
  }

  const resolveCollision = (
    myPos: { x: number; y: number }, 
    otherPos: { x: number; y: number }, 
    myVel: { x: number; y: number }
  ): { x: number; y: number } => {
    const dx = myPos.x - otherPos.x
    const dy = myPos.y - otherPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return myVel

    const nx = dx / distance
    const ny = dy / distance
    const dotProduct = myVel.x * nx + myVel.y * ny
    
    return {
      x: myVel.x - 2 * dotProduct * nx,
      y: myVel.y - 2 * dotProduct * ny
    }
  }

  useEffect(() => {
    if (!containerRef.current) return

    const arena = containerRef.current.parentElement
    if (!arena) return
    
    const arenaWidth = arena.offsetWidth
    const arenaHeight = arena.offsetHeight

    if (!isInitializedRef.current) {
      // ✅ Inicializa com padding para não nascer colado na borda
      const initialX = BOUNDARY_PADDING + Math.random() * (arenaWidth - imageSize - (BOUNDARY_PADDING * 2))
      const initialY = BOUNDARY_PADDING + Math.random() * (arenaHeight - imageSize - (BOUNDARY_PADDING * 2))
      
      setPosition({ x: initialX, y: initialY })
      updatePosition(profile.username, { x: initialX, y: initialY })

      // 🛠️ LÓGICA DE VELOCIDADE
      let speed;
      if (profile.isVerified) {
        speed = 1.5 + Math.random() * 1.5; 
      } else {
        speed = 1.0 + Math.random() * 1.4;
      }

      const angle = Math.random() * Math.PI * 2
      velocityRef.current = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
      
      isInitializedRef.current = true
    }

    const animate = () => {
      if (isHovered) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      setPosition(prev => {
        let newX = prev.x + velocityRef.current.x
        let newY = prev.y + velocityRef.current.y

        // ✅ CORREÇÃO AQUI: Adicionado BOUNDARY_PADDING na colisão lateral
        if (newX <= 0 || newX >= arenaWidth - imageSize - BOUNDARY_PADDING) {
          velocityRef.current.x *= -1
          newX = Math.max(0, Math.min(newX, arenaWidth - imageSize - BOUNDARY_PADDING))
        }

        // ✅ CORREÇÃO AQUI: Adicionado BOUNDARY_PADDING na colisão inferior/superior
        // Isso impede que a imagem passe da borda do container
        if (newY <= 0 || newY >= arenaHeight - imageSize - BOUNDARY_PADDING) {
          velocityRef.current.y *= -1
          newY = Math.max(0, Math.min(newY, arenaHeight - imageSize - BOUNDARY_PADDING))
        }

        const newPos = { x: newX, y: newY }

        Object.entries(allPositions).forEach(([username, otherPos]) => {
          if (username !== profile.username && otherPos) {
            if (checkCollision(newPos, otherPos, imageSize, imageSize)) {
              velocityRef.current = resolveCollision(newPos, otherPos, velocityRef.current)
              
              const dx = newPos.x - otherPos.x
              const dy = newPos.y - otherPos.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              
              if (distance > 0) {
                const pushDistance = (imageSize - distance) / 2
                newPos.x += (dx / distance) * pushDistance
                newPos.y += (dy / distance) * pushDistance
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

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isHovered, allPositions, profile.username, updatePosition, imageSize, profile.isVerified])

  useEffect(() => {
    if (!isHovered || !containerRef.current) return

    const arena = containerRef.current.parentElement
    if (!arena) return

    const arenaWidth = arena.offsetWidth
    const tooltipHeight = 80
    const tooltipWidth = 150

    let vertical = 'top'
    let horizontal = 'center'

    if (position.y < tooltipHeight) vertical = 'bottom'
    if (position.x < tooltipWidth / 2) horizontal = 'left'
    else if (position.x > arenaWidth - imageSize - tooltipWidth / 2) horizontal = 'right'

    setTooltipPosition({ vertical, horizontal })
  }, [isHovered, position, imageSize])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTooltipClass = (): string => {
    const classes = ['profile-info']
    if (tooltipPosition.vertical === 'bottom') classes.push('profile-info-bottom')
    if (tooltipPosition.horizontal === 'left') classes.push('profile-info-left')
    else if (tooltipPosition.horizontal === 'right') classes.push('profile-info-right')
    return classes.join(' ')
  }

  return (
    <div 
      ref={containerRef}
      className="profile-pic-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${imageSize}px`,
        height: `${imageSize}px`,
        position: 'absolute'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 👑 COROA FIXA SOBRE A FOTO */}
      {isAdmin && (
        <div className="admin-crown">👑</div>
      )}
      
      {isHovered && (
        <div className={getTooltipClass()} style={{zIndex: 999}}>
          <div className="profile-username">
            @{profile.username}
            {/* 👑 TEXTO ADM DOURADO */}
            {isAdmin && (
              <span style={{ 
                color: '#FFD700', 
                fontWeight: 'bold', 
                marginLeft: '6px',
                textShadow: '0 0 5px rgba(255, 215, 0, 0.5)'
              }}>
                ADM
              </span>
            )}
          </div>
          <div className="profile-followers">
            {formatNumber(profile.followers)} seguidores
          </div>
        </div>
      )}
      
      <img 
        src={profile.profilePic}
        alt={profile.username}
        className="profile-pic"
        onError={(e) => onImageError(e, profile.username)}
        onClick={(e) => {
          e.stopPropagation()
          onProfileClick(profile)
        }}
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
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
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
              @{profile.username}
              {/* Opcional: Mostrar badge no modal também */}
              {profile.isCreator && <span style={{marginLeft: '5px'}}>👑</span>}
            </div>
            <div className="modal-fullname">{profile.fullName || profile.username}</div>
          </div>
        </div>

        <div className="modal-stats">
          <div className="stat-item">
            <div className="stat-number">{formatNumber(profile.posts || 0)}</div>
            <div className="stat-label">Posts</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{formatNumber(profile.followers || 0)}</div>
            <div className="stat-label">Seguidores</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{formatNumber(profile.following || 0)}</div>
            <div className="stat-label">Seguindo</div>
          </div>
        </div>

        <div className="modal-bio-section">
          <div className="modal-bio-label">Biografia</div>
          {profile.biography ? (
            <div className="modal-bio-text">{profile.biography}</div>
          ) : (
            <div className="modal-bio-empty">Nenhuma biografia disponível</div>
          )}
        </div>

        <a 
          href={`https://www.instagram.com/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="modal-link-btn"
        >
          📸 Ver no Instagram
        </a>
      </div>
    </div>
  )
}