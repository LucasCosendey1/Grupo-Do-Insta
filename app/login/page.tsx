// app/login/page-CLIENT-SIDE.tsx
// Exemplo de como usar o scraping client-side

'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { searchInstagramProfileCached } from '@/lib/client-side-scraper'
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

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)

  // Busca automática COM SCRAPING CLIENT-SIDE
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
        const response = await fetch(`/api/instagram/perfil?username=${encodeURIComponent(cleanUsername)}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.profile) {
            const profiles: ProfileSearchResult[] = [{
              username: data.profile.username,
              fullName: data.profile.fullName || data.profile.username,
              profilePic: data.profile.profilePic,
              followers: data.profile.followers || 0,
              following: data.profile.following || 0,
              posts: data.profile.posts || 0,
              biography: data.profile.biography || '',
              isPrivate: data.profile.isPrivate || false,
              isVerified: data.profile.isVerified || false
            }]
            setSearchResults(profiles)
            setShowResults(true)
          } else {
            setSearchResults([])
            setShowResults(false)
          }
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
    }, 2000)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Fechar dropdown ao clicar fora
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
      
      // Sincronizar com banco de dados
      const syncResponse = await fetch('/api/instagram/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedProfile.username,
          profile: selectedProfile
        })
      })

      if (!syncResponse.ok) {
        console.error('⚠️ Falha na sincronização, mas continuando...')
      } else {
        console.log('✅ Dados sincronizados com sucesso!')
      }

    } catch (error) {
      console.error('⚠️ Erro na sincronização, mas continuando...', error)
    }

    // Salvar na sessão
    sessionStorage.setItem('userProfile', JSON.stringify(selectedProfile))

    setIsSyncing(false)

    // Redirecionamento inteligente
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin')

    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogin')
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
          <p className="subtitle" style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255,255,255,0.6)' }}>
            🌐 Usando seu IP para buscar perfil (mais confiável)
          </p>
        </div>

        <div className="login-content">
          <div className="input-group" ref={inputRef}>
            <label htmlFor="instagram-search">
              <span className="label-icon">@</span>
              Seu username do Instagram
            </label>
            <input
              type="text"
              id="instagram-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowResults(true)
              }}
              placeholder="Digite seu @username"
              className="input"
              autoComplete="off"
            />

            {isSearching && (
              <div className="search-loading">
                <div className="spinner"></div>
                <span>Buscando via seu IP...</span>
              </div>
            )}

            {showResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((profile) => (
                  <div
                    key={profile.username}
                    className="search-result-item"
                    onClick={() => handleSelectProfile(profile)}
                  >
                    <img
                      src={profile.profilePic}
                      alt={profile.username}
                      className="search-result-avatar"
                      onError={(e) => handleImageError(e, profile.username)}
                    />
                    <div className="search-result-info">
                      <div className="search-result-username">
                        @{profile.username}
                        {profile.isVerified && <span className="verified-badge">✓</span>}
                      </div>
                      <div className="search-result-name">{profile.fullName}</div>
                      <div className="search-result-stats">
                        {formatNumber(profile.followers)} seguidores
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedProfile && (
            <div className="selected-profile">
              <img
                src={selectedProfile.profilePic}
                alt={selectedProfile.username}
                onError={(e) => handleImageError(e, selectedProfile.username)}
              />
              <div className="selected-profile-info">
                <div className="selected-profile-username">
                  @{selectedProfile.username}
                  {selectedProfile.isVerified && <span className="verified-badge">✓</span>}
                </div>
                <div className="selected-profile-name">{selectedProfile.fullName}</div>
                <div className="selected-profile-stats">
                  {formatNumber(selectedProfile.followers)} seguidores
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!selectedProfile || isSyncing}
            className={`btn ${selectedProfile ? 'btn-primary' : 'btn-disabled'}`}
          >
            {isSyncing ? (
              <>
                <div className="spinner"></div>
                Entrando...
              </>
            ) : (
              '🚀 Entrar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}