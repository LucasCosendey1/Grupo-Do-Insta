'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
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
}

interface GroupData {
  id: string
  name: string
  icon: {
    id: string
    emoji: string
    name: string
  }
  creator: any
  members: Profile[]
  createdAt: string
}

export default function GrupoPage() {
  const [username, setUsername] = useState('')
  const params = useParams()
  const groupId = params.id as string
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  
  // DADOS DO GRUPO CARREGADOS DO LOCALSTORAGE
  const [groupData, setGroupData] = useState<GroupData | null>(null)

  // CARREGAR GRUPO AO INICIAR
  useEffect(() => {
    if (!groupId) return
    
    async function loadGroup() {
      try {
        console.log('🔍 Buscando grupo:', groupId)
        
        const response = await fetch(`/api/grupos/${groupId}`)
        
        if (!response.ok) {
          throw new Error('Grupo não encontrado')
        }
        
        const data = await response.json()
        
        if (data.success && data.group) {
          // Carregar dados básicos do grupo
          setGroupData({
            id: data.group.id,
            name: data.group.name,
            icon: data.group.icon,
            creator: data.group.creator,
            members: [],
            createdAt: data.group.createdAt
          })
          
          // Buscar perfis completos de cada username
// Buscar perfis completos de cada username
const usernames = data.group.usernames || []
console.log('👥 Carregando perfis:', usernames)

// Garantir que criador vem primeiro
const sortedUsernames = [...usernames]
const creatorIndex = sortedUsernames.indexOf(data.group.creator)
if (creatorIndex > 0) {
  // Mover criador para o início
  sortedUsernames.splice(creatorIndex, 1)
  sortedUsernames.unshift(data.group.creator)
}

const profilesData = []
for (const username of sortedUsernames) {
  try {
    const profileResponse = await fetch(`/api/scrape?username=${username}`)
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      profilesData.push(profileData)
    }
  } catch (err) {
    console.error('Erro ao carregar perfil:', username, err)
  }
}

setProfiles(profilesData)

          console.log('✅ Grupo carregado com', profilesData.length, 'membros')
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar grupo:', error)
        alert('Erro ao carregar grupo: ' + error)
      }
    }
    
    loadGroup()
  }, [groupId])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getTotalFollowers = (): number => {
    return profiles.reduce((total, profile) => total + profile.followers, 0)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!username.trim()) {
      setError('Digite um username')
      return
    }

    const cleanUsername = username.replace('@', '').trim().toLowerCase()
    
    if (profiles.some(p => p.username.toLowerCase() === cleanUsername)) {
      setError('Este perfil já foi adicionado!')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 1. Buscar dados do perfil
      const response = await fetch(`/api/scrape?username=${cleanUsername}`)
      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao buscar perfil')
      }

      // 2. Adicionar ao banco de dados
      const addResponse = await fetch('/api/grupos/adicionar-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId,  // ← USAR O ID DA URL
          username: cleanUsername
        })
      })

      if (!addResponse.ok) {
        const errorData = await addResponse.json()
        throw new Error(errorData.error || 'Erro ao adicionar membro')
      }

      // 3. Atualizar interface
      setProfiles([...profiles, data])
      setUsername('')
      
      console.log('✅ Membro adicionado:', cleanUsername)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil')
    } finally {
      setIsLoading(false)
    }
  }

    const handleRemove = async (usernameToRemove: string) => {
    if (!window.confirm(`Remover @${usernameToRemove} do grupo?`)) {
      return
    }

    try {
      // Remover do banco
      const response = await fetch('/api/grupos/remover-membro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: groupId,  // ← USAR O ID DA URL
          username: usernameToRemove
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao remover membro')
      }

      // Atualizar interface
      setProfiles(profiles.filter(p => p.username !== usernameToRemove))
      console.log('✅ Membro removido:', usernameToRemove)
      
    } catch (error) {
      console.error('❌ Erro ao remover membro:', error)
      alert('Erro ao remover membro: ' + error)
    }
  }

  const handleReset = () => {
    if (window.confirm('Deseja remover todos os perfis do grupo?')) {
      setProfiles([])
      setUsername('')
      setError('')
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    console.error('Erro ao carregar imagem para:', username)
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  return (
    <div className="container">
      <div className="card">
        {/* BOTÃO VOLTAR */}
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span>
          <span>Voltar</span>
        </Link>

        {/* HEADER COM DADOS DO GRUPO */}
        <div className="header">
          <div className="logo">
            {groupData?.icon?.emoji || '⚡'}
          </div>
          <h1>{groupData?.name || 'Insta do Grupo'}</h1>
          <p className="subtitle">Descubra o alcance total do seu grupo</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Adicionar membro (@username)</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite o @username do Instagram"
              className="input"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? '⏳ Buscando...' : '+ Adicionar ao Grupo'}
          </button>

          {error && (
            <div className="error">
              ❌ {error}
            </div>
          )}

          {profiles.length === 0 && (
            <div className="info-box">
              <strong>✨ Como funciona:</strong>
              1. Adicione os @usernames dos membros do grupo<br/>
              2. Veja o alcance total somado em tempo real<br/>
              3. Compartilhe o poder do seu grupo!
            </div>
          )}
        </form>

        {profiles.length > 0 && (
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
                  <span className="member-count">{profiles.length}</span> {profiles.length === 1 ? 'membro ativo' : 'membros ativos'}
                </div>
              </div>
            </div>

            <ProfilesArena 
              profiles={profiles}
              onRemove={handleRemove}
              onImageError={handleImageError}
              onProfileClick={setSelectedProfile}
            />

            <button className="btn btn-secondary" onClick={handleReset}>
              🔄 Resetar Grupo
            </button>
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
}

function ProfilesArena({ profiles, onRemove, onImageError, onProfileClick }: ProfilesArenaProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  const updatePosition = (username: string, position: { x: number; y: number }) => {
    setPositions(prev => ({
      ...prev,
      [username]: position
    }))
  }

  return (
    <div className="profiles-arena">
      {profiles.map((profile, index) => (
        <MovingProfile 
          key={profile.username}
          profile={profile}
          onRemove={onRemove}
          onImageError={onImageError}
          onProfileClick={onProfileClick}
          allPositions={positions}
          updatePosition={updatePosition}
          isAdmin={index === 0}
        />
      ))}
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
}

function MovingProfile({ profile, onRemove, onImageError, onProfileClick, allPositions, updatePosition, isAdmin }: MovingProfileProps) {
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
    
    if (followers <= 1000) {
      return MIN_SIZE
    } else if (followers >= 1000000) {
      return MAX_SIZE
    } else {
      const logMin = Math.log10(1000)
      const logMax = Math.log10(1000000)
      const logCurrent = Math.log10(followers)
      
      const percentage = (logCurrent - logMin) / (logMax - logMin)
      return MIN_SIZE + (MAX_SIZE - MIN_SIZE) * percentage
    }
  }

  const imageSize = calculateImageSize(profile.followers)

  const checkCollision = (pos1: { x: number; y: number }, pos2: { x: number; y: number }, size1: number, size2: number): boolean => {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const minDistance = (size1 + size2) / 2
    return distance < minDistance
  }

  const resolveCollision = (myPos: { x: number; y: number }, otherPos: { x: number; y: number }, myVel: { x: number; y: number }): { x: number; y: number } => {
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

      const speed = 1 + Math.random() * 1.5
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
  }, [isHovered, allPositions, profile.username, updatePosition, imageSize])

  useEffect(() => {
    if (!isHovered || !containerRef.current) return

    const arena = containerRef.current.parentElement
    if (!arena) return

    const arenaWidth = arena.offsetWidth
    const arenaHeight = arena.offsetHeight
    const tooltipHeight = 80
    const tooltipWidth = 150

    let vertical = 'top'
    let horizontal = 'center'

    if (position.y < tooltipHeight) {
      vertical = 'bottom'
    }

    if (position.x < tooltipWidth / 2) {
      horizontal = 'left'
    } else if (position.x > arenaWidth - imageSize - tooltipWidth / 2) {
      horizontal = 'right'
    }

    setTooltipPosition({ vertical, horizontal })
  }, [isHovered, position, imageSize])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getTooltipClass = (): string => {
    const classes = ['profile-info']
    if (tooltipPosition.vertical === 'bottom') {
      classes.push('profile-info-bottom')
    }
    if (tooltipPosition.horizontal === 'left') {
      classes.push('profile-info-left')
    } else if (tooltipPosition.horizontal === 'right') {
      classes.push('profile-info-right')
    }
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
      {isAdmin && (
        <div className="admin-crown">👑</div>
      )}
      
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
      
      {isHovered && (
        <div className={getTooltipClass()}>
          <div className="profile-username">
            @{profile.username}
            {isAdmin && <span className="admin-badge"> 👑 ADM</span>}
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
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-header-compact">
          <img 
            src={profile.profilePic}
            alt={profile.username}
            className="modal-profile-pic-small"
            onError={(e) => onImageError(e, profile.username)}
          />
          <div className="modal-user-info">
            <div className="modal-username">@{profile.username}</div>
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