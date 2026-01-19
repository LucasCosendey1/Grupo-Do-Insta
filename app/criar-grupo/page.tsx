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
  { id: 'lightning', emoji: '⚡', name: 'Raio' },
  { id: 'heart', emoji: '❤️', name: 'Coração' },
  { id: 'target', emoji: '🎯', name: 'Alvo' },
  { id: 'muscle', emoji: '💪', name: 'Força' },
  { id: 'brain', emoji: '🧠', name: 'Cérebro' },
  { id: 'money', emoji: '💰', name: 'Dinheiro' },
]

export default function CriarGrupoPage() {
  const router = useRouter()
  const [groupName, setGroupName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(GROUP_ICONS[0])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [tempUsername, setTempUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [usernameError, setUsernameError] = useState('')

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

  // ✅ BUSCAR PERFIL DO INSTAGRAM
  const handleSearchProfile = async () => {
    if (!tempUsername.trim()) {
      setUsernameError('Digite seu @username')
      return
    }

    setIsSearching(true)
    setUsernameError('')

    try {
      // Remove @ se existir
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
        setUsernameError('')
      } else {
        setUsernameError('Perfil não encontrado. Verifique o username.')
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      setUsernameError('Erro ao buscar perfil. Tente novamente.')
    } finally {
      setIsSearching(false)
    }
  }

  // ✅ VERIFICAR SE PODE CRIAR (nome + perfil)
  const canCreate = (): boolean => {
    return groupName.trim().length > 0 && userProfile !== null
  }

  // ✅ CRIAR GRUPO
  const handleCreateGroup = async () => {
    if (!canCreate()) {
      if (!groupName.trim()) {
        alert('Digite um nome para o grupo')
      } else if (!userProfile) {
        alert('Adicione seu perfil do Instagram')
      }
      return
    }

    // ✅ TypeScript: garantir que userProfile não é null
    if (!userProfile) return

    setIsLoading(true)

    try {
      console.log('🚀 Criando grupo no banco de dados...')
      
      const response = await fetch('/api/grupos/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: groupName,
          icon: selectedIcon,
          creatorUsername: userProfile.username
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar grupo')
      }

      const data = await response.json()
      
      if (data.success && data.groupId) {
        console.log('✅ Grupo criado com ID:', data.groupId)
        
        alert(`✅ Grupo "${groupName}" criado com sucesso!`)
        router.push(`/grupo/${data.groupId}`)
      } else {
        throw new Error('Resposta inválida da API')
      }

    } catch (error) {
      console.error('❌ Erro ao criar grupo:', error)
      alert('Erro ao criar grupo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleIconSelect = (icon: typeof GROUP_ICONS[0]) => {
    setSelectedIcon(icon)
    setShowIconPicker(false)
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
          <h1>Criar Novo Grupo</h1>
          <p className="subtitle">Configure seu grupo do Instagram</p>
        </div>

        <div className="create-group-content">
          {/* ✅ SELETOR DE ÍCONE COM LÁPIS */}
          <div className="icon-selector-section">
            <label className="section-label">
              <span className="label-icon">🎨</span>
              Ícone do Grupo
            </label>
            
            <div 
              className="group-icon-preview"
              onClick={() => setShowIconPicker(true)}
            >
              <div className="icon-circle">
                <span className="icon-emoji-large">{selectedIcon.emoji}</span>
              </div>
              <div className="icon-edit-badge">✏️</div>
              <div className="icon-hint">Toque para escolher</div>
            </div>
          </div>

          {/* ✅ NOME DO GRUPO */}
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
              className="input input-create"
              maxLength={50}
              autoFocus
            />
            <div className="char-count">{groupName.length}/50</div>
          </div>

          {/* ✅ CAMPO DE @ (se não estiver logado) */}
          {!userProfile && (
            <div className="input-group">
              <label htmlFor="instagram-username">
                <span className="label-icon">@</span>
                Seu Instagram
              </label>
              <div className="username-input-wrapper">
                <input
                  type="text"
                  id="instagram-username"
                  value={tempUsername}
                  onChange={(e) => {
                    setTempUsername(e.target.value)
                    setUsernameError('')
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSearchProfile()
                  }}
                  placeholder="seu_username"
                  className={`input input-username ${usernameError ? 'input-error' : ''}`}
                  disabled={isSearching}
                />
                <button
                  className="btn-search-username"
                  onClick={handleSearchProfile}
                  disabled={isSearching}
                >
                  {isSearching ? '⏳' : '🔍'}
                </button>
              </div>
              {usernameError && (
                <div className="input-error-message">{usernameError}</div>
              )}
              <div className="input-hint">
                Digite sem o @ - Ex: cristiano
              </div>
            </div>
          )}

          {/* ✅ PREVIEW DO GRUPO */}
          <div className="group-preview-section">
            <h3 className="preview-title">Preview do Grupo</h3>
            <div className="preview-card-modern">
              <div className="preview-header">
                <div className="preview-icon-small">{selectedIcon.emoji}</div>
                <div className="preview-info">
                  <div className="preview-name">{groupName || 'Nome do Grupo'}</div>
                  <div className="preview-members">
                    {userProfile ? (
                      <div className="preview-creator">
                        <img 
                          src={userProfile.profilePic}
                          alt={userProfile.username}
                          className="preview-avatar-tiny"
                          onError={(e) => handleImageError(e, userProfile.username)}
                        />
                        <span>@{userProfile.username}</span>
                        {userProfile.isVerified && <span className="verified-tiny">✓</span>}
                      </div>
                    ) : (
                      <span className="preview-empty">Aguardando perfil...</span>
                    )}
                  </div>
                </div>
              </div>
              
              {userProfile && (
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-icon-tiny">👥</span>
                    <span className="stat-value-tiny">{formatNumber(userProfile.followers)}</span>
                  </div>
                  <div className="preview-divider">•</div>
                  <div className="preview-stat">
                    <span className="stat-label-tiny">1 membro</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ✅ BOTÃO DE CRIAR (verde quando pronto) */}
          <button
            className={`btn ${canCreate() ? 'btn-create-ready' : 'btn-disabled'}`}
            onClick={handleCreateGroup}
            disabled={!canCreate() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="btn-icon">⏳</span>
                <span>Criando grupo...</span>
              </>
            ) : canCreate() ? (
              <>
                <span className="btn-icon">✨</span>
                <span>Criar Grupo</span>
                <span className="btn-arrow">→</span>
              </>
            ) : (
              <>
                <span className="btn-icon">⚠️</span>
                <span>
                  {!groupName.trim() && !userProfile 
                    ? 'Preencha nome e perfil' 
                    : !groupName.trim() 
                    ? 'Digite o nome do grupo' 
                    : 'Adicione seu perfil'}
                </span>
              </>
            )}
          </button>

          <div className="info-box info-box-tip">
            <strong>💡 Dica:</strong>
            <p>
              Escolha um nome criativo e um ícone que represente bem o grupo!
              Você poderá editar o nome depois.
            </p>
          </div>
        </div>

        {/* ✅ MODAL DE SELEÇÃO DE ÍCONE */}
        {showIconPicker && (
          <div className="modal-overlay" onClick={() => setShowIconPicker(false)}>
            <div className="modal-content icon-picker-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowIconPicker(false)}>
                ×
              </button>

              <div className="modal-header-simple">
                <h2>Escolha um Ícone</h2>
                <p className="modal-subtitle">Selecione o que melhor representa seu grupo</p>
              </div>

              <div className="icon-picker-grid">
                {GROUP_ICONS.map((icon) => (
                  <button
                    key={icon.id}
                    className={`icon-picker-option ${selectedIcon.id === icon.id ? 'selected' : ''}`}
                    onClick={() => handleIconSelect(icon)}
                  >
                    <span className="icon-picker-emoji">{icon.emoji}</span>
                    <span className="icon-picker-name">{icon.name}</span>
                    {selectedIcon.id === icon.id && (
                      <div className="icon-selected-badge">✓</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}