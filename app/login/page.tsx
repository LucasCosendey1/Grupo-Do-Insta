'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '../globals.css'

interface ProfileSearchResult {
  username: string
  fullName: string
  profilePic: string
  followers: number
  isVerified: boolean
}

export default function LoginPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
          const profiles = [{
            username: data.username,
            fullName: data.fullName || data.username,
            profilePic: data.profilePic,
            followers: data.followers,
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

  const handleLogin = () => {
    if (!selectedProfile) {
      alert('Por favor, selecione um perfil do Instagram')
      return
    }
    
    // Salvar perfil no localStorage
    localStorage.setItem('userProfile', JSON.stringify(selectedProfile))
    
    // ✅ VERIFICAR SE HÁ REDIRECIONAMENTO PENDENTE
    const redirectUrl = localStorage.getItem('redirectAfterLogin')
    
    if (redirectUrl) {
      console.log('🔄 Redirecionando para:', redirectUrl)
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
        <Link href="/" className="btn-back">
          <span className="back-arrow">←</span>
          <span>Voltar</span>
        </Link>

        <div className="header">
          <div className="logo login-logo">
            <div className="logo-inner">🔐</div>
          </div>
          <h1>Entrar no Insta Grupos</h1>
          <p className="subtitle">Conecte-se com seu perfil do Instagram</p>
        </div>

        <div className="login-content">
          <div className="input-group" ref={inputRef}>
            <label htmlFor="instagram-search">
              <span className="label-icon">@</span>
              Buscar seu perfil
            </label>
            <div className="input-wrapper">
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
              />
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

            {showResults && searchResults.length === 0 && !isSearching && searchTerm.length >= 2 && (
              <div className="search-results-dropdown">
                <div className="search-no-results">
                  <div className="no-results-icon">🔍</div>
                  <div className="no-results-text">Perfil não encontrado</div>
                  <div className="no-results-hint">Verifique se o username está correto</div>
                </div>
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

          <button 
            className={`btn ${selectedProfile ? 'btn-primary' : 'btn-disabled'}`}
            onClick={handleLogin}
            disabled={!selectedProfile}
          >
            {selectedProfile ? (
              <>
                <span className="btn-icon">✨</span>
                <span>Continuar como @{selectedProfile.username}</span>
                <span className="btn-arrow">→</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                <span>Busque seu perfil acima para continuar</span>
              </>
            )}
          </button>

          <div className="security-info">
            <div className="security-icon">🔒</div>
            <div className="security-text">
              <strong>Sua privacidade está protegida</strong>
              <p>Não solicitamos senha. Acessamos apenas dados públicos do Instagram.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}