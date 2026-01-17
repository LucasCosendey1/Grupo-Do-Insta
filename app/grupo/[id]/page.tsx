'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import '../../globals.css'

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
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isUserMember, setIsUserMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [showCopiedMessage, setShowCopiedMessage] = useState(false)

  // ✅ VERIFICAR SE USUÁRIO ESTÁ LOGADO
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile')
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        setUserProfile(profile)
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
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
          console.error('❌ Erro na resposta:', errorData)
          throw new Error(errorData.error || 'Grupo não encontrado')
        }
        
        const data = await response.json()
        console.log('📦 Dados recebidos da API:', data)
        
        if (data.success && data.group) {
          console.log('✅ Grupo encontrado:', data.group.name)
          
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
        alert('Erro ao carregar grupo: ' + error)
      } finally {
        setIsLoadingGroup(false)
      }
    }
    
    loadGroup()
  }, [groupId])

  // ✅ VERIFICAR SE USUÁRIO É MEMBRO DO GRUPO
  useEffect(() => {
    if (userProfile && profiles.length > 0) {
      const isMember = profiles.some(
        p => p.username.toLowerCase() === userProfile.username.toLowerCase()
      )
      setIsUserMember(isMember)
    }
  }, [userProfile, profiles])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTotalFollowers = (): number => {
    return profiles.reduce((total, profile) => total + profile.followers, 0)
  }

  // ✅ COPIAR LINK DE CONVITE
  const handleCopyInviteLink = () => {
    const inviteLink = window.location.href
    navigator.clipboard.writeText(inviteLink)
    setShowCopiedMessage(true)
    setTimeout(() => setShowCopiedMessage(false), 3000)
  }

  // ✅ PARTICIPAR DO GRUPO
  const handleJoinGroup = async () => {
    if (!userProfile) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname)
      router.push('/login')
      return
    }

    setIsJoining(true)

    try {
      console.log('🚀 Participando do grupo:', groupId)
      
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
        throw new Error(addResult.error || 'Erro ao participar do grupo')
      }

      console.log('✅ Participou do grupo com sucesso')

      // Evita duplicação ao entrar
      setProfiles(prevProfiles => {
        const filtered = prevProfiles.filter(p => p.username.toLowerCase() !== userProfile.username.toLowerCase())
        return [...filtered, { ...profileData, isCreator: false }]
      })
      
      setIsUserMember(true)
      alert('🎉 Bem-vindo ao grupo!')
      
    } catch (err) {
      console.error('❌ Erro:', err)
      alert('Erro ao participar do grupo: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    } finally {
      setIsJoining(false)
    }
  }

  // ✅ REMOVER MEMBRO (só admin pode)
  const handleRemove = async (usernameToRemove: string) => {
    if (!userProfile) return
    
    const isCreator = groupData?.creator.toLowerCase() === userProfile.username.toLowerCase()
    
    if (!isCreator) {
      alert('Apenas o criador do grupo pode remover membros!')
      return
    }

    if (!window.confirm(`Remover @${usernameToRemove} do grupo?`)) {
      return
    }

    try {
      const response = await fetch('/api/grupos/remover-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId,
          username: usernameToRemove
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao remover membro')
      }

      // Remove da lista visualmente
      setProfiles(prev => prev.filter(p => p.username.toLowerCase() !== usernameToRemove.toLowerCase()))
      alert('✅ Membro removido com sucesso!')
      
    } catch (error) {
      alert('Erro ao remover membro: ' + error)
    }
  }

  // ✅ SAIR DO GRUPO (CORRIGIDO)
  const handleLeaveGroup = async () => {
    if (!userProfile) return

    if (!window.confirm('Tem certeza que deseja sair do grupo?')) {
      return
    }

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
        
        // 🚨 CORREÇÃO CRÍTICA AQUI 🚨
        // Removemos o usuário da lista 'profiles' imediatamente.
        // Isso remove a bola da tela e corrige o total de seguidores.
        setProfiles(prev => prev.filter(p => p.username.toLowerCase() !== userProfile.username.toLowerCase()))
      }

    } catch (error) {
      alert('Erro ao sair do grupo.')
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  if (!isLoadingGroup && !userProfile) {
    return (
      <div className="container">
        <div className="card">
          <div className="header">
            <div className="logo">
              {groupData?.icon?.emoji || '⚡'}
            </div>
            <h1>{groupData?.name || 'Grupo do Instagram'}</h1>
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
              <span className="btn-icon">🚀</span>
              <span>Fazer Login</span>
            </button>
          </div>

          <div className="info-box">
            <strong>💡 Como funciona:</strong>
            <p>
              1. Faça login com seu @username do Instagram<br/>
              2. Você será redirecionado de volta para este grupo<br/>
              3. Poderá ver os membros e decidir se quer participar
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingGroup) {
    return (
      <div className="container">
        <div className="card">
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
      <div className="card">
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span>
          <span>Voltar</span>
        </Link>

        <div className="header">
          <div className="logo">
            {groupData?.icon?.emoji || '⚡'}
          </div>
          <h1>{groupData?.name || 'Grupo do Instagram'}</h1>
          <p className="subtitle">
            {isUserMember 
              ? 'Você faz parte deste grupo' 
              : 'Compartilhe o link para convidar pessoas'}
          </p>
        </div>

        <div className="group-actions">
          {isUserMember ? (
            <>
              <button 
                className="btn btn-secondary"
                onClick={handleCopyInviteLink}
              >
                <span className="btn-icon">🔗</span>
                <span>{showCopiedMessage ? 'Link Copiado!' : 'Copiar Link de Convite'}</span>
              </button>

              <button 
                className="btn btn-danger"
                onClick={handleLeaveGroup}
              >
                <span className="btn-icon">🚪</span>
                <span>Sair do Grupo</span>
              </button>
            </>
          ) : userProfile && profiles.length > 0 ? (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleJoinGroup}
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <span className="btn-icon">⏳</span>
                    <span>Participando...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✨</span>
                    <span>Participar do Grupo</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-primary"
                onClick={handleJoinGroup}
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <span className="btn-icon">⏳</span>
                    <span>Participando...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">✨</span>
                    <span>Participar do Grupo</span>
                  </>
                )}
              </button>

              <div className="info-box">
                <strong>👋 Bem-vindo!</strong>
                <p>
                  Você foi convidado para este grupo.<br/>
                  Clique em "Participar" para fazer parte e ver todos os membros.
                </p>
              </div>
            </>
          )}
        </div>

        {profiles.length > 0 && userProfile && (
          <div className="profiles-container">
            <div className="total-stats">
              <div className="stats-icon">📊</div>
              <div className="stats-content">
                <div className="total-label">Alcance Total do Grupo</div>
                <div className="total-number">
                  {formatNumber(getTotalFollowers())}
                  <span className="followers-text">seguidores</span>
                </div>
                <div className="total-members">
                  <span className="member-count">{profiles.length}</span>{' '}
                  {profiles.length === 1 ? 'membro ativo' : 'membros ativos'}
                </div>
              </div>
            </div>

            {!isUserMember && (
              <div className="info-box" style={{ marginBottom: '20px' }}>
                <strong>👀 Modo Visualização</strong>
                <p>
                  Você não é mais membro deste grupo, mas pode continuar visualizando as estatísticas.
                  {' '}<span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)' }} onClick={handleJoinGroup}>
                    Clique aqui para participar novamente.
                  </span>
                </p>
              </div>
            )}

            <ProfilesArena 
              profiles={profiles}
              onRemove={handleRemove}
              onImageError={handleImageError}
              onProfileClick={setSelectedProfile}
              creatorUsername={groupData?.creator || ''}
              currentUsername={userProfile?.username || ''}
              isUserMember={isUserMember}
            />
          </div>
        )}

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

interface ProfilesArenaProps {
  profiles: Profile[]
  onRemove: (username: string) => void
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
  onProfileClick: (profile: Profile) => void
  creatorUsername: string
  currentUsername: string
  isUserMember: boolean
}

function ProfilesArena({ 
  profiles, 
  onRemove, 
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
            onRemove={onRemove}
            onImageError={onImageError}
            onProfileClick={onProfileClick}
            allPositions={positions}
            updatePosition={updatePosition}
            isAdmin={isAdmin}
            // Lógica para saber se pode remover: O usuário atual é o criador E o perfil alvo não é ele mesmo
            canRemove={isUserMember && (creatorUsername.toLowerCase() === currentUsername.toLowerCase()) && (profile.username.toLowerCase() !== creatorUsername.toLowerCase())}
          />
        )
      })}
    </div>
  )
}

interface MovingProfileProps {
  profile: Profile
  onRemove: (username: string) => void
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
  onProfileClick: (profile: Profile) => void
  allPositions: Record<string, { x: number; y: number }>
  updatePosition: (username: string, position: { x: number; y: number }) => void
  isAdmin: boolean
  canRemove: boolean
}

function MovingProfile({ 
  profile, 
  onRemove, 
  onImageError, 
  onProfileClick, 
  allPositions, 
  updatePosition, 
  isAdmin,
  canRemove
}: MovingProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ vertical: 'top', horizontal: 'center' })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isInitializedRef = useRef(false)

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
      const initialX = Math.random() * (arenaWidth - imageSize)
      const initialY = Math.random() * (arenaHeight - imageSize)
      setPosition({ x: initialX, y: initialY })
      updatePosition(profile.username, { x: initialX, y: initialY })

      // 🛠️ LÓGICA DE VELOCIDADE 🛠️
      let speed;
      if (profile.isVerified) {
        // ⚡ Verificados = Rápidos
        speed = 1.5 + Math.random() * 1.5; 
      } else {
        // 🐢 Não Verificados = Lentos (Modo Zen)
        speed = 0.2 + Math.random() * 0.4;
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

        if (newX <= 0 || newX >= arenaWidth - imageSize) {
          velocityRef.current.x *= -1
          newX = Math.max(0, Math.min(newX, arenaWidth - imageSize))
        }
        if (newY <= 0 || newY >= arenaHeight - imageSize) {
          velocityRef.current.y *= -1
          newY = Math.max(0, Math.min(newY, arenaHeight - imageSize))
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
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 👑 COROA FIXA SOBRE A FOTO */}
      {isAdmin && (
        <div className="admin-crown">👑</div>
      )}
      
      {canRemove && (
        <button 
          className="remove-btn"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(profile.username)
          }}
          title="Remover perfil"
        >
          ×
        </button>
      )}
      
      {isHovered && (
        <div className={getTooltipClass()}>
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