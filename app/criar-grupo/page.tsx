'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../globals.css'

interface UserProfile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  isVerified: boolean
}

const GROUP_ICONS = [
  { id: 'rocket', emoji: '🚀', name: 'Foguete' },
  { id: 'star', emoji: '⭐', name: 'Estrela' },
  { id: 'fire', emoji: '🔥', name: 'Fogo' },
  { id: 'trophy', emoji: '🏆', name: 'Troféu' },
  { id: 'crown', emoji: '👑', name: 'Coroa' },
  { id: 'diamond', emoji: '💎', name: 'Diamante' },
]

export default function CriarGrupoPage() {
  const router = useRouter()
  const [groupName, setGroupName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(GROUP_ICONS[0])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [tempUsername, setTempUsername] = useState('')
  const [isSearching, setIsSearching] = useState(false)

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

  const handleIconSelect = (icon: typeof GROUP_ICONS[0]) => {
    setSelectedIcon(icon)
  }

  const handleSearchProfile = async () => {
    if (!tempUsername.trim()) {
      alert('Digite seu @username')
      return
    }

    setIsSearching(true)

    try {
      const cleanUsername = tempUsername.replace('@', '').trim().toLowerCase()
      const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUsername)}`)
      
      if (response.ok) {
        const data = await response.json()
        const profile = {
          username: data.username,
          fullName: data.fullName || data.username,
          profilePic: data.profilePic,
          followers: data.followers,
          isVerified: data.isVerified || false
        }
        
        setUserProfile(profile)
        localStorage.setItem('userProfile', JSON.stringify(profile))
        setShowLoginPrompt(false)
      } else {
        alert('Perfil não encontrado. Verifique o username.')
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      alert('Erro ao buscar perfil. Tente novamente.')
    } finally {
      setIsSearching(false)
    }
  }

const handleCreateGroup = async () => {
  if (!groupName.trim()) {
    alert('Digite um nome para o grupo')
    return
  }

  if (!userProfile) {
    setShowLoginPrompt(true)
    return
  }

  setIsLoading(true)

  setTimeout(() => {
    const groupData = {
      id: Date.now().toString(),
      name: groupName,
      icon: selectedIcon,
      creator: userProfile,
      members: [userProfile],
      createdAt: new Date().toISOString()
    }

    const savedGroups = JSON.parse(localStorage.getItem('groups') || '[]')
    savedGroups.push(groupData)
    localStorage.setItem('groups', JSON.stringify(savedGroups))

    alert(`✅ Grupo "${groupName}" criado com sucesso!`)
    router.push('/grupo')  // ← MUDANÇA AQUI!
  }, 1500)
}

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  return (
    <div className="container">
      <div className="card create-group-card">
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span>
          <span>Voltar</span>
        </Link>

        <div className="header">
          <div className="logo create-logo">
            <div className="logo-inner">{selectedIcon.emoji}</div>
          </div>
          <h1>Criar Novo Grupo</h1>
          <p className="subtitle">Configure seu grupo do Instagram</p>
        </div>

        <div className="create-group-content">
          <div className="input-group">
            <label htmlFor="group-name">
              <span className="label-icon">✏️</span>
              Nome do Grupo
            </label>
            <input
              type="text"
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Meu Squad, Influencers Brasil..."
              className="input"
              maxLength={50}
              autoFocus
            />
            <div className="char-count">{groupName.length}/50</div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-icon">🎨</span>
              Escolha um Ícone
            </label>
            <div className="icons-grid">
              {GROUP_ICONS.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  className={`icon-option ${selectedIcon.id === icon.id ? 'selected' : ''}`}
                  onClick={() => handleIconSelect(icon)}
                >
                  <span className="icon-emoji">{icon.emoji}</span>
                  <span className="icon-name">{icon.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="group-preview">
            <div className="preview-label">Preview do Grupo</div>
            <div className="preview-card">
              <div className="preview-icon">{selectedIcon.emoji}</div>
              <div className="preview-info">
                <div className="preview-name">{groupName || 'Nome do Grupo'}</div>
                <div className="preview-members">
                  {userProfile ? '1 membro' : '0 membros'}
                </div>
              </div>
            </div>
          </div>

          {userProfile ? (
            <div className="founder-section">
              <div className="founder-label">
                <span className="label-icon">👤</span>
                Membro Fundador
              </div>
              <div className="founder-card">
                <img
                  src={userProfile.profilePic}
                  alt={userProfile.username}
                  className="founder-avatar"
                  onError={(e) => handleImageError(e, userProfile.username)}
                />
                <div className="founder-info">
                  <div className="founder-username">
                    @{userProfile.username}
                    {userProfile.isVerified && <span className="verified-badge-small">✓</span>}
                  </div>
                  <div className="founder-followers">
                    {formatNumber(userProfile.followers)} seguidores
                  </div>
                </div>
                <button
                  className="change-profile-btn"
                  onClick={() => {
                    setUserProfile(null)
                    setShowLoginPrompt(true)
                  }}
                >
                  Trocar
                </button>
              </div>
            </div>
          ) : (
            <div className="login-prompt-section">
              <div className="prompt-icon">👤</div>
              <div className="prompt-text">Identifique-se para criar o grupo</div>
              <button
                className="btn-prompt-login"
                onClick={() => setShowLoginPrompt(true)}
              >
                Adicionar meu perfil
              </button>
            </div>
          )}

          <button
            className={`btn ${groupName && userProfile ? 'btn-primary' : 'btn-disabled'}`}
            onClick={handleCreateGroup}
            disabled={!groupName || !userProfile || isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-icon">⏳</span>
                <span>Criando grupo...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">✨</span>
                <span>Criar Grupo</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>

          <div className="info-box">
            <strong>💡 Próximos Passos:</strong>
            <p>
              Após criar o grupo, você poderá adicionar outros membros,
              visualizar métricas e compartilhar o link do grupo.
            </p>
          </div>
        </div>
      </div>

      {showLoginPrompt && (
        <div className="modal-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="modal-content login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginPrompt(false)}>
              ×
            </button>

            <div className="modal-header">
              <div className="modal-icon">🔐</div>
              <h2>Adicionar seu Perfil</h2>
              <p>Digite seu @username do Instagram</p>
            </div>

            <div className="modal-body">
              <div className="input-group">
                <label htmlFor="temp-username">Username do Instagram</label>
                <input
                  type="text"
                  id="temp-username"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  placeholder="@seu_username"
                  className="input"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSearchProfile()
                  }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSearchProfile}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <span className="btn-icon">⏳</span>
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🔍</span>
                    <span>Buscar Perfil</span>
                  </>
                )}
              </button>

              <div className="modal-divider">
                <span>ou</span>
              </div>

              <Link href="/login" className="btn btn-secondary">
                <span className="btn-icon">🚀</span>
                <span>Fazer Login Completo</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}