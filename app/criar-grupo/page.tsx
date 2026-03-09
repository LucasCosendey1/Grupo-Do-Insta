//app/criar-grupo/page.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
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

interface ProfileSearchResult {
  username: string
  fullName: string
  profilePic: string
  followers: number
  isVerified: boolean
  isPrivate: boolean
  following: number
  posts: number
  biography: string
}

// 🚀 ÍCONE PADRÃO
const DEFAULT_ICON = { id: 'rocket', emoji: '🚀', name: 'Foguete' }

// 🎨 CORES NEON
const NEON_GREEN = '#00ff88'
const NEON_BLUE = '#00bfff'

export default function CriarGrupoPage() {
  const router = useRouter()
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [groupName, setGroupName] = useState('')
  const selectedIcon = DEFAULT_ICON 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  // --- ESTADOS DA BUSCA AUTOMÁTICA ---
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  
  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)

  // 1. Carregar perfil salvo
  useEffect(() => {
    const savedProfile = sessionStorage.getItem('userProfile')
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        setUserProfile(profile)
      } catch (error) {
        console.error('Erro ao carregar perfil:', error)
      }
    }
  }, [])

  // 2. BUSCA AUTOMÁTICA
  useEffect(() => {
    // Se já temos um perfil selecionado ou busca curta, paramos
    if (userProfile || searchTerm.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    setIsSearching(true)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const cleanUsername = searchTerm.replace('@', '').trim().toLowerCase()
        const response = await fetch(`/api/instagram/perfil?username=${encodeURIComponent(cleanUsername)}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.profile) {
            const profiles: ProfileSearchResult[] = [{
              username: data.profile.username,
              fullName: data.profile.fullName || data.profile.username,
              profilePic: data.profile.profilePic,
              followers: data.profile.followers || 0,
              isVerified: data.profile.isVerified || false,
              isPrivate: data.profile.isPrivate || false,
              following: data.profile.following || 0,
              posts: data.profile.posts || 0,
              biography: data.profile.biography || ''
            }]
            setSearchResults(profiles)
            setShowResults(true)
            setUsernameError('')
          } else {
            setSearchResults([])
            setShowResults(false)
          }
        } else {
          setSearchResults([])
          setShowResults(false)
        }
      } catch (error) {
        console.error('Erro na busca:', error)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchTerm, userProfile])

  // 3. Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 4. Selecionar Perfil
  const handleSelectProfile = (profile: ProfileSearchResult) => {
    const simplified: UserProfile = {
      username: profile.username,
      fullName: profile.fullName,
      profilePic: profile.profilePic,
      followers: profile.followers,
      isVerified: profile.isVerified
    }
    setUserProfile(simplified)
    sessionStorage.setItem('userProfile', JSON.stringify(simplified))
    setSearchTerm('')
    setShowResults(false)
  }

  // 5. Criar Grupo (CORRIGIDO AQUI)
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !userProfile) return
    setIsLoading(true)

    try {
      console.log('🚀 Criando grupo...')
      
      // 🚨 VOLTEI PARA A URL ANTIGA QUE FUNCIONAVA
      const response = await fetch('/api/grupos/criar', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          icon: selectedIcon,
          creatorUsername: userProfile.username,
          creatorData: userProfile
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar grupo')
      }
      
      if (data.success) {
        const identifier = data.slug || data.groupId
        router.push(`/grupo/${identifier}`)
      } else {
        throw new Error('Resposta inválida da API')
      }
    } catch (error) {
      console.error('❌ Erro:', error)
      alert('Erro ao criar grupo: ' + (error instanceof Error ? error.message : 'Tente novamente'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
  }

  // ============================================
  // 🔥 LÓGICA DE CORES NEON BLINDADA 🔥
  // ============================================
  
  const isNameFilled = groupName.trim().length > 0
  const isProfileSelected = userProfile !== null

  // 1. Barra do Nome (Simples)
  const nameInputColor = isNameFilled ? NEON_BLUE : NEON_GREEN

  // 2. Barra do Criador (Seus IFs)
  let creatorInputColor = NEON_GREEN 

  if (!isNameFilled) {
    // If Barra do nome do grupo NÃO estiver preenchida -> Neon azul
    creatorInputColor = NEON_BLUE
  } else if (isProfileSelected) {
    // If Barra de procurar o @ ESTIVER preenchida (selecionado) -> Neon Azul Neon
    creatorInputColor = NEON_BLUE
  } else {
    // Else (Nome preenchido mas @ não selecionado) -> Neon Verde
    creatorInputColor = NEON_GREEN
  }

  return (
    <div className="container">
      <div className="card create-group-card">
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span><span>Voltar</span>
        </Link>

        <div className="header">
          <div className="logo">🚀</div>
          <h1>Criar Novo Grupo</h1>
          <p className="subtitle">Configure seu grupo</p>
        </div>

        <div className="create-group-content">
          
          {/* 1. NOME DO GRUPO */}
          <div className="input-group">
            <label htmlFor="group-name">
              <span className="label-icon">✏️</span> Nome do Grupo
            </label>
            <input
              type="text"
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Meu Squad..."
              className="input input-create"
              maxLength={50}
              autoFocus
              style={{
                borderColor: nameInputColor,
                boxShadow: `0 0 20px ${nameInputColor}66`,
                transition: 'all 0.3s ease'
              }}
            />
            <div className="char-count">{groupName.length}/50</div>
          </div>

          {/* 2. PERFIL DO CRIADOR */}
          <div className="input-group" ref={inputRef}>
            <label>
              <span className="label-icon">👤</span> Criador do Grupo
            </label>

            {userProfile ? (
              // ✅ USUÁRIO LOGADO (SELECIONADO) -> AZUL SE NOME TIVER VAZIO OU SELECIONADO
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: `${creatorInputColor}10`, // Transparência leve da cor atual
                border: `1px solid ${creatorInputColor}`,
                borderRadius: '12px',
                boxShadow: `0 0 15px ${creatorInputColor}33`,
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={userProfile.profilePic} 
                    alt={userProfile.username}
                    onError={(e) => handleImageError(e, userProfile.username)}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      border: `2px solid ${creatorInputColor}`,
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: creatorInputColor, fontWeight: 'bold', fontSize: '16px' }}>
                      @{userProfile.username}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>Criador</span>
                  </div>
                </div>
                
              </div>
            ) : (
              // ✅ USUÁRIO NÃO LOGADO (INPUT DE PESQUISA)
              <div className="input-wrapper" style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setShowResults(true) }}
                  placeholder="Digite seu @username do Instagram"
                  className="input"
                  style={{ 
                    paddingRight: '40px',
                    borderColor: creatorInputColor,
                    boxShadow: `0 0 15px ${creatorInputColor}33`,
                    transition: 'all 0.3s ease'
                  }}
                />
                
                {/* Spinner */}
                {isSearching && (
                  <div style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)'
                  }}>
                    <div className="mini-spinner" style={{ borderTopColor: creatorInputColor }}></div>
                  </div>
                )}

                {/* Dropdown de Resultados */}
                {showResults && searchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {searchResults.map((profile) => (
                      <div
                        key={profile.username}
                        className="search-result-item"
                        onClick={() => handleSelectProfile(profile)}
                      >
                        <div className="result-avatar-wrapper">
                          <img
                            src={profile.profilePic}
                            alt={profile.username}
                            className="search-result-avatar"
                            onError={(e) => handleImageError(e, profile.username)}
                          />
                          {profile.isVerified && <div className="verified-badge-overlay">✓</div>}
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-username">@{profile.username}</div>
                          <div className="search-result-details">
                            <span className="search-result-name">{profile.fullName}</span>
                          </div>
                        </div>
                        <div className="result-arrow">→</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {usernameError && (
              <div style={{ color: '#ff6b6b', fontSize: '13px', marginTop: '8px', fontWeight: '600' }}>
                ⚠️ {usernameError}
              </div>
            )}
          </div>

          {/* 3. BOTÃO FINAL */}
          <button
            className={`btn ${groupName.trim() && userProfile ? 'btn-create-ready' : 'btn-disabled'}`}
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || !userProfile || isLoading}
            style={{ marginTop: '20px' }}
          >
            {isLoading ? '⏳ Criando grupo...' : (groupName.trim() && userProfile ? '✨ Criar Grupo →' : '⚠️ Preencha os dados acima')}
          </button>

        </div>
      </div>
    </div>
  )
}