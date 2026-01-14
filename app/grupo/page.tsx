'use client'

import { useState, useEffect, useRef } from 'react'
import '../globals.css'

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
  recentPosts: RecentPost[]
}

interface RecentPost {
  id: string
  shortcode: string
  imageUrl: string
  likes: number
  comments: number
  isVideo: boolean
  caption: string
}

// Interface para os dados do grupo (vinda do segundo código)
interface GroupData {
  id: string
  name: string
  icon: any
  creator: any
  members: Profile[]
  createdAt: string
}

export default function Home() {
  const [username, setUsername] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  
  // Estado para armazenar os dados do grupo carregado
  const [groupData, setGroupData] = useState<GroupData | null>(null)

  // EFEITO: Carrega o grupo salvo ao iniciar (Simulando usuário logado)
  useEffect(() => {
    const savedGroups = localStorage.getItem('groups')
    if (savedGroups) {
      try {
        const groups = JSON.parse(savedGroups)
        if (groups.length > 0) {
          // Pega o último grupo criado/acessado
          const lastGroup = groups[groups.length - 1]
          setGroupData(lastGroup)
          
          // Se o grupo tiver membros, já carrega eles como bolinhas
          if (lastGroup.members && lastGroup.members.length > 0) {
            setProfiles(lastGroup.members)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar grupo:', error)
      }
    }
  }, [])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
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
      const response = await fetch(`/api/scrape?username=${cleanUsername}`)
      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao buscar perfil')
      }

      setProfiles([...profiles, data])
      setUsername('')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar o perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = (usernameToRemove: string) => {
    setProfiles(profiles.filter(p => p.username !== usernameToRemove))
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
        {/* HEADER MODIFICADO: Mostra Ícone e Nome do Grupo carregado */}
        <div className="header">
          <div className="logo">{groupData?.icon?.emoji || '⚡'}</div>
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
            <div className="error">❌ {error}</div>
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
              <div className="total-label">Alcance Total do Grupo</div>
              <div className="total-number">
                {formatNumber(getTotalFollowers())}
              </div>
              <div className="total-members">
                {profiles.length} {profiles.length === 1 ? 'membro ativo' : 'membros ativos'}
              </div>
            </div>

            {/* A ARENA DAS BOLINHAS */}
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

// --- COMPONENTES DA ARENA (CÓDIGO 1) ---

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
    // Adicionei styles inline de backup para garantir que o retângulo exista
    // caso o CSS não esteja carregando corretamente a classe .profiles-arena
    <div 
      className="profiles-arena" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '400px', // Altura fixa para garantir o "retângulo"
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        overflow: 'hidden',
        margin: '20px 0',
        background: 'rgba(0,0,0,0.2)'
      }}
    >
      {profiles.map((profile) => (
        <MovingProfile 
          key={profile.username}
          profile={profile}
          onRemove={onRemove}
          onImageError={onImageError}
          onProfileClick={onProfileClick}
          allPositions={positions}
          updatePosition={updatePosition}
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
}

function MovingProfile({ profile, onRemove, onImageError, onProfileClick, allPositions, updatePosition }: MovingProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ vertical: 'top', horizontal: 'center' })
  const velocityRef = useRef({ x: 0, y: 0 })
  const isInitializedRef = useRef(false)

  const imageSize = 70

  const checkCollision = (pos1: { x: number; y: number }, pos2: { x: number; y: number }): boolean => {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < imageSize
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
            if (checkCollision(newPos, otherPos)) {
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
  }, [isHovered, allPositions, profile.username, updatePosition])

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
  }, [isHovered, position])

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
        // Garante que é absoluto para poder se mover dentro da arena
        position: 'absolute',
        width: '70px',
        height: '70px',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
      
      <div className={getTooltipClass()}>
        <div className="profile-username">@{profile.username}</div>
        <div className="profile-followers">
          {formatNumber(profile.followers)} seguidores
        </div>
      </div>
      
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
        // Garante a "bolinha" visualmente
        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
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

        <div className="modal-header">
          <img 
            src={profile.profilePic}
            alt={profile.username}
            className="modal-profile-pic"
            onError={(e) => onImageError(e, profile.username)}
          />
          <div className="modal-username">@{profile.username}</div>
          <div className="modal-fullname">{profile.fullName || profile.username}</div>
        </div>

        <div className="modal-stats">
          <div className="stat-item">
            <div className="stat-number">{formatNumber(profile.posts || 0)}</div>
            <div className="stat-label">Posts</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{formatNumber(profile.followers)}</div>
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

        {profile.recentPosts && profile.recentPosts.length > 0 && (
          <div className="modal-posts-section">
            <div className="modal-posts-label">Postagens Recentes</div>
            <div className="modal-posts-grid">
              {profile.recentPosts.map((post) => (
                <a
                  key={post.id}
                  href={`https://www.instagram.com/p/${post.shortcode}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-post-item"
                >
                  <img 
                    src={post.imageUrl}
                    alt={`Post de @${profile.username}`}
                    className="modal-post-image"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/300x300/0a0a0f/00bfff?text=Imagem+indisponível'
                    }}
                  />
                  {post.isVideo && <div className="modal-video-icon">▶️</div>}
                  <div className="modal-post-overlay">
                    <div className="modal-post-stat">❤️ {formatNumber(post.likes)}</div>
                    <div className="modal-post-stat">💬 {formatNumber(post.comments)}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {profile.recentPosts && profile.recentPosts.length === 0 && (
          <div className="modal-posts-section">
            <div className="modal-posts-label">Postagens Recentes</div>
            <div className="modal-no-posts">Nenhuma postagem disponível</div>
          </div>
        )}

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