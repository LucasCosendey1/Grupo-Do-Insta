//app/criar-grupo/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { processInstagramImageUrl, handleImageError } from '@/lib/image-utils'
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

const DEFAULT_ICON = { id: 'rocket', emoji: '🚀', name: 'Foguete' }
const NEON_GREEN = '#00ff88'
const NEON_BLUE = '#00bfff'

export default function CriarGrupoPage() {
  const router = useRouter()
  
  const [groupName, setGroupName] = useState('')
  const selectedIcon = DEFAULT_ICON 
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLDivElement>(null)

useEffect(() => {
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
      const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUsername)}`)
      
      if (response.ok) {
        const data = await response.json()
        setSearchResults([{
          username: data.username,
          fullName: data.fullName || data.username,
          profilePic: data.profilePic,
          followers: data.followers || 0,
          isVerified: data.isVerified || false,
          isPrivate: data.isPrivate || false,
          following: data.following || 0,
          posts: data.posts || 0,
          biography: data.biography || ''
        }])
        setShowResults(true)
        setUsernameError('')
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    } catch (error) {
      console.error('Erro na busca:', error)
      setSearchResults([])
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }, 500)

  return () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
  }
}, [searchTerm, userProfile])

  useEffect(() => {
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
        const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUsername)}`)
        
        if (response.ok) {
          const data = await response.json()
          const profiles: ProfileSearchResult[] = [{
            username: data.username,
            fullName: data.fullName || data.username,
            profilePic: data.profilePic,
            followers: data.followers || 0,
            isVerified: data.isVerified || false,
            isPrivate: data.isPrivate || false,
            following: data.following || 0,
            posts: data.posts || 0,
            biography: data.biography || ''
          }]
          setSearchResults(profiles)
          setShowResults(true)
          setUsernameError('')
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
    const simplified: UserProfile = {
      username: profile.username,
      fullName: profile.fullName,
      profilePic: profile.profilePic,
      followers: profile.followers,
      isVerified: profile.isVerified
    }
    setUserProfile(simplified)
    localStorage.setItem('userProfile', JSON.stringify(simplified))
    setSearchTerm('')
    setShowResults(false)
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !userProfile) return
    setIsLoading(true)

    try {
      console.log('🚀 Criando grupo...')
      
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

  const isNameFilled = groupName.trim().length > 0
  const isProfileSelected = userProfile !== null

  const nameInputColor = isNameFilled ? NEON_BLUE : NEON_GREEN

  let creatorInputColor = NEON_GREEN 

  if (!isNameFilled) {
    creatorInputColor = NEON_BLUE
  } else if (isProfileSelected) {
    creatorInputColor = NEON_BLUE
  } else {
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

          <div className="input-group" ref={inputRef}>
            <label>
              <span className="label-icon">👤</span> Criador do Grupo
            </label>

            {/* 🔥 CORREÇÃO 1: Foto do Perfil Selecionado */}
            {userProfile ? (
              (() => {
                const safeProfilePic = processInstagramImageUrl(userProfile.profilePic, userProfile.username)
                
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: `${creatorInputColor}10`,
                    border: `1px solid ${creatorInputColor}`,
                    borderRadius: '12px',
                    boxShadow: `0 0 15px ${creatorInputColor}33`,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img 
                        src={safeProfilePic}
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
                )
              })()
            ) : (
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
                
                {isSearching && (
                  <div style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)'
                  }}>
                    <div className="mini-spinner" style={{ borderTopColor: creatorInputColor }}></div>
                  </div>
                )}

                {/* 🔥 CORREÇÃO 2: Dropdown de Resultados */}
                {showResults && searchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {searchResults.map((profile) => {
                      const safeProfilePic = processInstagramImageUrl(profile.profilePic, profile.username)
                      
                      return (
                        <div
                          key={profile.username}
                          className="search-result-item"
                          onClick={() => handleSelectProfile(profile)}
                        >
                          <div className="result-avatar-wrapper">
                            <img
                              src={safeProfilePic}
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
                      )
                    })}
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