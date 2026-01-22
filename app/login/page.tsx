// app/login/page.tsx
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import '../globals.css'

interface ProfileSearchResult {
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

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ 1. Identificar se é fluxo de convite
  const context = searchParams.get('context')
  const groupName = searchParams.get('gName')
  const groupEmoji = searchParams.get('gEmoji')
  const isJoinFlow = context === 'join' && groupName

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // --- LÓGICA DE BUSCA (Mantida igual) ---
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    setIsSearching(true)

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const cleanUsername = searchTerm.replace('@', '').trim().toLowerCase()
        const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUsername)}`)
        
        if (response.ok) {
          const data = await response.json()
          const profiles: ProfileSearchResult[] = [{
            username: data.username,
            fullName: data.fullName || data.username,
            profilePic: data.profilePic,
            followers: data.followers || 0,
            following: data.following || 0,
            posts: data.posts || 0,
            biography: data.biography || '',
            isPrivate: data.isPrivate || false,
            isVerified: data.isVerified || false
          }]
          setSearchResults(profiles)
          setShowResults(true)
        } else {
          setSearchResults([])
          setShowResults(false)
        }
      } catch (error) {
        console.error('Erro ao buscar perfis:', error)
        setSearchResults([])
        setShowResults(false)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectProfile = (profile: ProfileSearchResult) => {
    setSelectedProfile(profile)
    setSearchTerm(`@${profile.username}`)
    setShowResults(false)
  }

  const handleLogin = async () => {
    if (!selectedProfile) {
      alert('Por favor, selecione um perfil do Instagram')
      return
    }
    
    setIsSyncing(true)
    
    try {
      console.log('🔄 Sincronizando dados com o banco...')
      
      const syncResponse = await fetch('/api/usuarios/sincronizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedProfile.username,
          fullName: selectedProfile.fullName,
          profilePic: selectedProfile.profilePic,
          followers: selectedProfile.followers,
          following: selectedProfile.following,
          posts: selectedProfile.posts,
          biography: selectedProfile.biography,
          isVerified: selectedProfile.isVerified,
          isPrivate: selectedProfile.isPrivate,
          instagramId: selectedProfile.username
        })
      })

      if (!syncResponse.ok) {
        console.error('⚠️ Falha na sincronização, mas continuando...')
      } else {
        console.log('✅ Dados sincronizados com sucesso!')
      }
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar:', error)
    }
    
    // Salvar no localStorage
    localStorage.setItem('userProfile', JSON.stringify(selectedProfile))
    
    setIsSyncing(false)
    
    // ✅ REDIRECIONAMENTO INTELIGENTE
    const redirectUrl = localStorage.getItem('redirectAfterLogin')
    
    if (redirectUrl) {
      localStorage.removeItem('redirectAfterLogin')
      router.push(redirectUrl)
    } else {
      router.push('/')
    }
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
      <div className="card login-card">

        {/* ✅ 2. HEADER CONDICIONAL */}
        <div className="header">
          {isJoinFlow ? (
             // Visual de Convite
             <>
               <div className="logo create-logo" style={{ marginBottom: '15px' }}>
                 <div className="logo-inner" style={{ fontSize: '2.5rem' }}>
                   {groupEmoji || '👥'}
                 </div>
               </div>
               <h1 style={{ fontSize: '1.6rem' }}>Entrar em "{groupName}"</h1>
               <p className="subtitle" style={{ color: '#fff', opacity: 0.9, marginTop: '8px' }}>
                 Informe o seu @ do Instagram para entrar no grupo
               </p>
             </>
          ) : (
             // Visual Padrão
             <>
               <div className="logo login-logo">
                 <div className="logo-inner">🔐</div>
               </div>
               <h1>Entrar no Insta Grupos</h1>
               <p className="subtitle">Conecte-se com seu perfil do Instagram</p>
             </>
          )}
        </div>

        <div className="login-content">
          <div className="input-group" ref={inputRef}>
            <label htmlFor="instagram-search">
              <span className="label-icon">@</span>
              {isJoinFlow ? 'Seu usuário do Insta' : 'Buscar seu perfil'}
            </label>
            <div className="input-wrapper">
              
              {/* 👇👇👇 AQUI ESTÁ A MUDANÇA PARA O NEON VERDE SEMPRE ACESO 👇👇👇 */}
              <input
                type="text"
                id="instagram-search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (selectedProfile) setSelectedProfile(null)
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowResults(true)
                }}
                placeholder="Digite seu @username"
                className="input input-search"
                autoComplete="off"
                style={{
                  borderColor: '#00ff88', // Cor da borda Neon
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)', // O brilho Neon (Sempre Ativo)
                  transition: 'all 0.3s ease'
                }}
              />
              {/* 👆👆👆 FIM DA MUDANÇA 👆👆👆 */}

              {isSearching && (
                <div className="search-loading">
                  <div className="mini-spinner"></div>
                </div>
              )}
            </div>

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
                      {profile.isVerified && (
                        <div className="verified-badge-overlay">✓</div>
                      )}
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-username">
                        @{profile.username}
                      </div>
                      <div className="search-result-details">
                        <span className="search-result-name">{profile.fullName}</span>
                        <span className="search-result-separator">•</span>
                        <span className="search-result-followers">
                          {formatNumber(profile.followers)} seguidores
                        </span>
                      </div>
                    </div>
                    <div className="result-arrow">→</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedProfile && (
            <div className="selected-profile-preview">
              <div className="preview-badge">Perfil Selecionado</div>
              <div className="selected-profile-content">
                <div className="selected-avatar-wrapper">
                  <img
                    src={selectedProfile.profilePic}
                    alt={selectedProfile.username}
                    className="selected-profile-avatar"
                    onError={(e) => handleImageError(e, selectedProfile.username)}
                  />
                  {selectedProfile.isVerified && (
                    <div className="verified-badge-large">✓</div>
                  )}
                </div>
                <div className="selected-profile-info">
                  <div className="selected-profile-username">
                    @{selectedProfile.username}
                  </div>
                  <div className="selected-profile-name">{selectedProfile.fullName}</div>
                  <div className="selected-profile-stats">
                    <div className="stat-pill">
                      <span className="stat-icon">👥</span>
                      <span className="stat-value">{formatNumber(selectedProfile.followers)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ 3. BOTÃO CONDICIONAL */}
          <button 
            className={`btn ${selectedProfile ? 'btn-primary' : 'btn-disabled'}`}
            onClick={handleLogin}
            disabled={!selectedProfile || isSyncing}
          >
            {isSyncing ? (
              <>
                <span className="btn-icon">🔄</span>
                <span>Sincronizando...</span>
              </>
            ) : selectedProfile ? (
              <>
                <span className="btn-icon">✨</span>
                {/* Texto do botão muda se for fluxo de convite */}
                <span>
                    {isJoinFlow 
                      ? `Entrar no Grupo como @${selectedProfile.username}`
                      : `Continuar como @${selectedProfile.username}`
                    }
                </span>
                <span className="btn-arrow">→</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                <span>Busque seu perfil acima</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ✅ Wrapper com Suspense (Obrigatório para useSearchParams no Next.js)
export default function LoginPage() {
  return (
    <Suspense fallback={
        <div className="container">
            <div className="card login-card">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Carregando...</p>
                </div>
            </div>
        </div>
    }>
      <LoginContent />
    </Suspense>
  )
}