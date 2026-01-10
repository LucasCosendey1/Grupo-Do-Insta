'use client'

import { useState, useEffect, useRef } from 'react'
import './globals.css'

export default function Home() {
  const [username, setUsername] = useState('')
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedProfile, setSelectedProfile] = useState(null)

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getTotalFollowers = () => {
    return profiles.reduce((total, profile) => total + profile.followers, 0)
  }

  const handleSubmit = async (e) => {
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
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar perfil')
      }

      const data = await response.json()
      setProfiles([...profiles, data])
      setUsername('')
      
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = (usernameToRemove) => {
    setProfiles(profiles.filter(p => p.username !== usernameToRemove))
  }

  const handleReset = () => {
    if (window.confirm('Deseja remover todos os perfis do grupo?')) {
      setProfiles([])
      setUsername('')
      setError('')
    }
  }

  const handleImageError = (e, username) => {
    console.error('Erro ao carregar imagem para:', username)
    e.target.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="logo">⚡</div>
          <h1>Insta do Grupo</h1>
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

function ProfilesArena({ profiles, onRemove, onImageError, onProfileClick }) {
  return (
    <div className="profiles-arena">
      {profiles.map((profile) => (
        <MovingProfile 
          key={profile.username}
          profile={profile}
          onRemove={onRemove}
          onImageError={onImageError}
          onProfileClick={onProfileClick}
        />
      ))}
    </div>
  )
}

function MovingProfile({ profile, onRemove, onImageError, onProfileClick }) {
  const containerRef = useRef(null)
  const animationRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState('top') // 'top' ou 'bottom'
  const velocityRef = useRef({ x: 0, y: 0 })
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const arena = containerRef.current.parentElement
    const arenaWidth = arena.offsetWidth
    const arenaHeight = arena.offsetHeight
    const imageSize = 70 // Tamanho da imagem (70px)

    // Posição inicial aleatória (apenas uma vez)
    if (!isInitializedRef.current) {
      const initialX = Math.random() * (arenaWidth - imageSize)
      const initialY = Math.random() * (arenaHeight - imageSize)
      setPosition({ x: initialX, y: initialY })

      // Velocidade inicial aleatória (pixels por frame)
      const speed = 0.8 + Math.random() * 1.2 // Velocidade entre 0.8 e 2 px/frame
      const angle = Math.random() * Math.PI * 2 // Ângulo aleatório
      velocityRef.current = {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      }
      
      isInitializedRef.current = true
    }

    const animate = () => {
      // Se estiver com hover, não atualiza a posição mas continua o loop
      if (isHovered) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      setPosition(prev => {
        let newX = prev.x + velocityRef.current.x
        let newY = prev.y + velocityRef.current.y

        // Colisão com bordas e mudança de direção
        if (newX <= 0 || newX >= arenaWidth - imageSize) {
          velocityRef.current.x *= -1
          newX = Math.max(0, Math.min(newX, arenaWidth - imageSize))
        }
        if (newY <= 0 || newY >= arenaHeight - imageSize) {
          velocityRef.current.y *= -1
          newY = Math.max(0, Math.min(newY, arenaHeight - imageSize))
        }

        return { x: newX, y: newY }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isHovered])

  // Detectar se está perto do topo quando hover acontece
  useEffect(() => {
    if (isHovered && position.y < 100) {
      setTooltipPosition('bottom')
    } else {
      setTooltipPosition('top')
    }
  }, [isHovered, position.y])

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <div 
      ref={containerRef}
      className="profile-pic-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
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
      
      <div className={`profile-info ${tooltipPosition === 'bottom' ? 'profile-info-bottom' : ''}`}>
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
      />
    </div>
  )
}

function ProfileModal({ profile, onClose, onImageError }) {
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // Fechar modal ao clicar no overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    const handleEscape = (e) => {
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
                      e.target.src = 'https://via.placeholder.com/300x300/0a0a0f/00bfff?text=Imagem+indisponível'
                    }}
                  />
                  {post.isVideo && (
                    <div className="modal-video-icon">▶️</div>
                  )}
                  <div className="modal-post-overlay">
                    <div className="modal-post-stat">
                      ❤️ {formatNumber(post.likes)}
                    </div>
                    <div className="modal-post-stat">
                      💬 {formatNumber(post.comments)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {profile.recentPosts && profile.recentPosts.length === 0 && (
          <div className="modal-posts-section">
            <div className="modal-posts-label">Postagens Recentes</div>
            <div className="modal-no-posts">
              Nenhuma postagem disponível
            </div>
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