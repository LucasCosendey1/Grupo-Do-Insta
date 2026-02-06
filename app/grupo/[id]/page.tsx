'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { sql } from '@vercel/postgres'
import '../../globals.css'

// ==========================================
// INTERFACES
// ==========================================

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
  isCreator?: boolean
}

interface GroupData {
  id: string
  slug?: string
  name: string
  icon: {
    id?: string
    emoji: string
    name: string
  }
  creator?: string
  profiles?: Profile[]
  members?: Profile[]
  createdAt: string
}

interface UserProfile {
  username: string
  fullName: string
  profilePic: string
  followers: number
  following: number
  posts: number
  biography: string
  isVerified: boolean
  isPrivate?: boolean
}

// 👑 CONSTANTE DO ADMIN GERAL
const ADMIN_USERNAME = 'instadogrupo.oficial'

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function GrupoPage() {
  const router = useRouter()
  const params = useParams()
  
  const groupId = (params?.id as string) || ''
  
  // Estados de Dados do Grupo
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [groupData, setGroupData] = useState<GroupData | null>(null)
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)

  // Estados do Usuário
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isUserMember, setIsUserMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  
  // Estados de Busca (Login Embutido)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Estados de UI (Menu)
  const [showMenu, setShowMenu] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copiedType, setCopiedType] = useState<'link' | 'message' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // 👑 VERIFICAÇÃO DE SUPER ADMIN
  const isAdmin = userProfile?.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()

  // 1. Validação de Rota
  useEffect(() => {
    if (!groupId) {
      console.error('❌ groupId está undefined!')
      router.push('/')
      return
    }
  }, [groupId, router])

  // 2. Inicialização
  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        try {
          setUserProfile(JSON.parse(savedProfile))
        } catch (error) {
          console.error(error)
        }
      }
    }
  }, [])

  // 3. Carregar Grupo
  useEffect(() => {
    if (!groupId) return
    
    async function loadGroup() {
      try {
        setIsLoadingGroup(true)
        
        const response = await fetch(`/api/grupos/${groupId}`, { 
          cache: 'no-store' 
        })
        
        if (!response.ok) {
          throw new Error('Grupo não encontrado')
        }
        
        const data = await response.json()
        
        if (data.success && data.group) {
          setGroupData(data.group)
          setProfiles(data.group.profiles || [])
        }
      } catch (error) {
        console.error('❌ Erro ao carregar grupo:', error)
      } finally {
        setIsLoadingGroup(false)
      }
    }
    
    loadGroup()
  }, [groupId])

  // 4. Verificar Membro (MODIFICADO PARA ADMIN)
  useEffect(() => {
    if (userProfile && profiles.length > 0) {
      const isMember = profiles.some(p => p.username.toLowerCase() === userProfile.username.toLowerCase())
      const adminViewing = userProfile.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()
      
      // Admin sempre pode visualizar, mesmo não sendo membro
      setIsUserMember(isMember || adminViewing)
    }
  }, [userProfile, profiles])

  // 5. Lógica de Busca
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([])
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
          setSearchResults([data]) 
        } else {
          setSearchResults([])
        }
      } catch (error) {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 600)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchTerm])

  // ==========================================
  // AÇÕES
  // ==========================================

  const handleLoginAndJoin = async (profileData: any) => {
    const userToSave: UserProfile = {
        username: profileData.username,
        fullName: profileData.fullName,
        profilePic: profileData.profilePic,
        followers: profileData.followers,
        following: profileData.following,
        posts: profileData.posts,
        biography: profileData.biography,
        isVerified: profileData.isVerified,
        isPrivate: profileData.isPrivate
    }
    localStorage.setItem('userProfile', JSON.stringify(userToSave))
    setUserProfile(userToSave)
    setSearchTerm('')
    setSearchResults([])

    setIsJoining(true)
    try {
        fetch('/api/usuarios/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        })

        const res = await fetch('/api/grupos/adicionar-membro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: groupId,
                username: profileData.username,
                profileData: profileData
            })
        })

        const result = await res.json()
        
        if (!res.ok && !result.error?.includes('já está no grupo')) {
            throw new Error(result.error)
        }

        setProfiles(prev => {
            const exists = prev.some(p => p.username.toLowerCase() === profileData.username.toLowerCase())
            if (exists) return prev
            return [...prev, { ...profileData, isCreator: false }]
        })
        setIsUserMember(true)

    } catch (err) {
        alert('Erro ao entrar no grupo.')
    } finally {
        setIsJoining(false)
    }
  }

  const handleJoinOnly = async () => {
    if (!userProfile) return
    setIsJoining(true)
    
    try {
      const profileDataCompleto = {
        username: userProfile.username,
        fullName: userProfile.fullName,
        profilePic: userProfile.profilePic,
        followers: userProfile.followers,
        following: userProfile.following || 0,
        posts: userProfile.posts || 0,
        biography: userProfile.biography || '',
        isPrivate: userProfile.isPrivate || false,
        isVerified: userProfile.isVerified
      }
      
      await handleLoginAndJoin(profileDataCompleto)
    } catch (e) {
      console.error('❌ Erro ao entrar no grupo:', e)
      alert('Erro ao entrar no grupo.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!userProfile || !window.confirm('Sair do grupo?')) return
    setShowMenu(false)
    await fetch('/api/grupos/sair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, username: userProfile.username })
    })
    setIsUserMember(false)
    setProfiles(prev => prev.filter(p => p.username.toLowerCase() !== userProfile.username.toLowerCase()))
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const getTotalFollowers = () => profiles.reduce((total, p) => total + p.followers, 0)

  const handleCopyMessage = () => {
    const link = `${window.location.origin}/grupo/${groupId}`
    const msg = `🚀 Entre no meu grupo "${groupData?.name}"!\n\n${link}`
    navigator.clipboard.writeText(msg)
    setCopiedType('message')
    setTimeout(() => setCopiedType(null), 2000)
  }

  const handleNativeShare = async () => {
    if (typeof navigator.share === 'function' && groupData) {
        const link = `${window.location.origin}/grupo/${groupId}`
        const msg = `✨ Convite Especial!\nVenha fazer parte do "${groupData.name}" 🚀\n\n👥 ${profiles.length} Membros\n📊 ${formatNumber(getTotalFollowers())} de Audiência Combinada\n\nJunte-se a nós aqui: 👇\n${link}`
        navigator.share({ 
            title: `Convite: ${groupData.name}`, 
            text: msg
          })
    } else {
        handleCopyMessage()
    }
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, username: string) => {
    if (!e.currentTarget.src.includes('ui-avatars.com')) {
      e.currentTarget.src = `https://ui-avatars.com/api/?name=${username}&size=200&background=00bfff&color=fff&bold=true`
    }
  }

  // --- RENDERS ---
  if (!isMounted) return null

  if (isLoadingGroup) {
    return (
      <div className="container">
        <div className="card grupo-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card grupo-card">
        
      {/* HEADER TOP */}
      <div className="grupo-header" style={{ 
        display: 'flex', 
        justifyContent: isUserMember ? 'space-between' : 'center',
        alignItems: 'center', 
        width: '100%',
        padding: '0 10px'
      }}>
        {/* BOTÃO VOLTAR */}
        {isUserMember && (
          <Link href="/" className="btn-back-large">
            <span className="back-arrow-large">←</span><span>Voltar</span>
          </Link>
        )}

        {/* MENU (Apenas para membros reais, não admin em modo viewer) */}
        {isUserMember && !isAdmin && (
          <div className="group-menu-top" ref={menuRef} style={{ position: 'relative' }}>
            <button className="btn-menu-top" onClick={() => setShowMenu(!showMenu)}>⋮</button>
            {showMenu && (
              <div className="dropdown-menu-top" style={{ top: '100%', right: 0, marginTop: '8px', zIndex: 50 }}>
                <button className="menu-item-top" onClick={() => setShowShareOptions(!showShareOptions)}>
                  Compartilhar {showShareOptions ? '▼' : '▶'}
                </button>
                {showShareOptions && (
                  <div className="share-submenu">
                    <button className="submenu-item" onClick={handleNativeShare}>Nativo</button>
                    <button className="submenu-item" onClick={handleCopyMessage}>
                      {copiedType === 'message' ? 'Copiado!' : 'Copiar Link'}
                    </button>
                  </div>
                )}
                <button className="menu-item-top menu-item-leave" onClick={handleLeaveGroup}>🚪 Sair</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* INFO GRUPO */}
        <div className="header">
          <div className="logo">{groupData?.icon?.emoji || '⚡'}</div>
          <h1>{groupData?.name}</h1>
          
          <div className="subtitle" style={{marginTop: 5}}>
              {!isUserMember ? (
                'Para entrar no grupo, informe seu Instagram:'
              ) : (
                <div style={{display:'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20, width: '100%', padding: '0 10px', boxSizing: 'border-box'}}>
                    <p style={{marginBottom: 14, color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', textAlign: 'center', lineHeight: '1.4'}}>
                       Convide seus amigos e ajude o grupo a decolar! 🚀
                    </p>
                    
                    <div style={{display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '400px'}}>
                        
                        <button 
                          onClick={handleCopyMessage} 
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.08)', 
                            color: 'rgba(255, 255, 255, 0.4)',
                            padding: '10px 16px',
                            borderRadius: '50px', 
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                          onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                          }}
                          onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
                          }}
                        >
                            <span>🔗</span> {copiedType === 'message' ? 'Copiado!' : 'Copiar'}
                        </button>

                        <button 
                          onClick={handleNativeShare} 
                          style={{
                            background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)', 
                            border: 'none',
                            color: '#000', 
                            padding: '12px 28px', 
                            borderRadius: '50px', 
                            fontSize: '15px', 
                            cursor: 'pointer',
                            fontWeight: '800', 
                            boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)', 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            transition: 'all 0.2s ease',
                            flex: 1,
                            minWidth: '160px',
                            maxWidth: '240px',
                            justifyContent: 'center',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                              Compartilhar Grupo
                        </button>

                    </div>
                </div>
              )}
          </div>
        </div>

        {/* LOGIN EMBUTIDO */}
        {!userProfile && (
            <div className="login-embedded-container" style={{ marginBottom: 20, padding: '0 10px' }}>
                <div className="input-group" style={{ position: 'relative' }}>
                    <div className="input-wrapper">
                        <span className="input-prefix" style={{position:'absolute', left:15, top:'50%', transform: 'translateY(-50%)', fontSize:18, color:'#666', zIndex: 1}}>@</span>
                        <input 
                            className="input" 
                            style={{
                                paddingLeft: 35, 
                                width: '100%', 
                                boxSizing: 'border-box',
                                border: '1px solid #00ff88',
                                boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
                                borderRadius: '12px',
                                outline: 'none',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                color: '#fff'
                            }}
                            placeholder="seu_usuario_insta"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                          {isSearching && (
                            <div className="mini-spinner" style={{position:'absolute', right:15, top:'50%', transform: 'translateY(-50%)', width:20, height:20, borderTopColor: '#00ff88'}}></div>
                        )}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="search-results-dropdown" style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            background: '#111', 
                            border: '1px solid #333', 
                            borderRadius: 8,
                            zIndex: 10,
                            marginTop: 5,
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            {searchResults.map(p => (
                                <div 
                                    key={p.username} 
                                    className="search-result-item"
                                    style={{ padding: 10, display:'flex', alignItems:'center', gap: 10, cursor:'pointer', borderBottom:'1px solid #222' }}
                                    onClick={() => handleLoginAndJoin(p)}
                                >
                                    <img src={p.profilePic} style={{width:35, height:35, borderRadius:'50%', flexShrink: 0}} onError={(e) => handleImageError(e, p.username)} alt={p.username}/>
                                    <div style={{flex:1, minWidth: 0}}>
                                        <div style={{fontWeight:'bold', fontSize:14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>@{p.username}</div>
                                        <div style={{fontSize:12, color:'#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.fullName}</div>
                                    </div>
                                    <div style={{fontSize:12, color:'#4CAF50', flexShrink: 0}}>Entrar →</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {isJoining && <p style={{textAlign:'center', fontSize:12, color:'#888', marginTop:5}}>Entrando...</p>}
            </div>
        )}

        {/* BOTÃO PARTICIPAR - ESCONDER PARA ADMIN */}
        {userProfile && !isUserMember && !isAdmin && (
          <div className="join-section" style={{padding: '0 10px'}}>
             <div style={{textAlign:'center', marginBottom:15, fontSize:13, color:'#aaa'}}>
                Você está logado como <strong style={{color:'#fff'}}>@{userProfile.username}</strong>
             </div>
             <button className="btn btn-join" onClick={handleJoinOnly} disabled={isJoining} style={{width: '100%', maxWidth: '100%'}}>
               {isJoining ? '⏳ Entrando...' : '✨ Entrar no Grupo'}
             </button>
             <button 
                className="btn-link" 
                style={{display:'block', margin:'10px auto', background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:12}}
                onClick={() => {
                    localStorage.removeItem('userProfile')
                    setUserProfile(null)
                }}
             >
                Trocar de conta
             </button>
          </div>
        )}

        {/* 👑 AVISO PARA ADMIN */}
        {userProfile && !isUserMember && isAdmin && (
          <div style={{
            padding: '20px',
            margin: '20px 10px',
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%)',
            border: '2px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>👑</div>
            <h3 style={{ color: '#FFD700', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              Modo Administrador
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6' }}>
              Você está visualizando este grupo como admin. Você pode ver todos os membros e estatísticas, mas não pode participar do grupo.
            </p>
          </div>
        )}

        {/* ARENA E STATS */}
        {isUserMember && profiles.length > 0 && (
          <div className="profiles-container">
            <div className="total-stats-mobile" style={{
              marginBottom: '16px',
              padding: '16px 20px', 
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              height: 'auto',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div className="total-label-mobile" style={{ marginBottom: '6px', fontSize: '13px', textTransform: 'lowercase' }}>membros</div>
                <div className="total-number-mobile" style={{ fontSize: '24px', fontWeight: '700' }}>{profiles.length}</div>
              </div>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px'}}>
                  <div className="total-label-mobile" style={{ fontSize: '13px', textTransform: 'lowercase' }}>seguidores total</div>
                </div>
                <div className="total-number-mobile" style={{ fontSize: '24px', fontWeight: '700' }}>{formatNumber(getTotalFollowers())}</div>
              </div>
            </div>
            <ProfilesArena 
              profiles={profiles}
              onImageError={handleImageError}
              onProfileClick={setSelectedProfile}
              creatorUsername={groupData?.creator || ''}
              currentUsername={userProfile?.username || ''}
              isUserMember={isUserMember}
            />
          </div>
        )}

        {/* MODAL DE PERFIL */}
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

// ==========================================
// ARENA & FÍSICA
// ==========================================

interface ProfilesArenaProps {
  profiles: Profile[]
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
  onProfileClick: (profile: Profile) => void
  creatorUsername: string
  currentUsername: string
  isUserMember: boolean
}

// State armazena {x, y, size} para colisões precisas
function ProfilesArena({ profiles, onImageError, onProfileClick, creatorUsername }: ProfilesArenaProps) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; size: number }>>({})

  const updatePosition = (username: string, position: { x: number; y: number }, size: number) => {
    setPositions(prev => ({ ...prev, [username]: { ...position, size } }))
  }

  return (
    <div className="profiles-arena" style={{
      position: 'relative',
      width: '100%',
      minHeight: '400px',
      height: 'calc(100vh - 450px)',
      maxHeight: '600px',
      overflow: 'hidden',
      touchAction: 'pan-y pinch-zoom'
    }}>
      {profiles.map((profile) => (
        <MovingProfile 
          key={profile.username}
          profile={profile}
          onImageError={onImageError}
          onProfileClick={onProfileClick}
          allPositions={positions}
          updatePosition={updatePosition}
          isAdmin={profile.isCreator || false}
        />
      ))}
    </div>
  )
}

// ==========================================
// MOVING PROFILE - CORRIGIDO E ROBUSTO
// ==========================================

interface MovingProfileProps {
  profile: Profile
  onImageError: (e: React.SyntheticEvent<HTMLImageElement>, username: string) => void
  onProfileClick: (profile: Profile) => void
  allPositions: Record<string, { x: number; y: number; size: number }>
  updatePosition: (username: string, position: { x: number; y: number }, size: number) => void
  isAdmin: boolean
}

function MovingProfile({ 
  profile, 
  onImageError, 
  onProfileClick, 
  allPositions, 
  updatePosition, 
  isAdmin 
}: MovingProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [tooltipPosition, setTooltipPosition] = useState({ vertical: 'top', horizontal: 'center' })
  
  // Velocidade em linha reta (direção normalizada)
  const velocityRef = useRef({ x: 0, y: 0 })
  
  // Cooldowns individuais para cada colisão
  const collisionCooldowns = useRef<Record<string, number>>({})
  const COLLISION_COOLDOWN = 1000 // 1 segundo para colisões entre bolinhas
  
  // Cooldown específico para colisões com a parede
  const lastWallCollisionTime = useRef(0)
  const WALL_COLLISION_COOLDOWN = 200 // 0.2 segundos para colisões com parede
  
  const isInitializedRef = useRef(false)
  const BOUNDARY_PADDING = 5

  // ==========================================
  // CÁLCULOS AUXILIARES
  // ==========================================

  // Define tamanho da bolinha com base nos seguidores (Logarítmico)
  const calculateImageSize = (followers: number): number => {
    const MIN_SIZE = 45
    const MAX_SIZE = 100
    if (followers <= 1000) return MIN_SIZE
    if (followers >= 1000000) return MAX_SIZE
    const logMin = Math.log10(1000)
    const logMax = Math.log10(1000000)
    const logCurrent = Math.log10(followers)
    const percentage = (logCurrent - logMin) / (logMax - logMin)
    return MIN_SIZE + (MAX_SIZE - MIN_SIZE) * percentage
  }

  const imageSize = calculateImageSize(profile.followers)

  // Verifica se duas bolinhas estão colidindo (Soma dos raios)
  const checkCollision = (
    pos1: { x: number; y: number }, 
    pos2: { x: number; y: number }, 
    size1: number, 
    size2: number
  ): boolean => {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    const radius1 = size1 / 2
    const radius2 = size2 / 2
    // +5px de margem para evitar overlap visual
    return distance < (radius1 + radius2) + 5
  }

  // Encontra a melhor direção livre para "fugir" de aglomerações
  const findBestDirection = (currentPos: { x: number; y: number }): { x: number; y: number } => {
    const arena = containerRef.current?.parentElement
    if (!arena) return { x: 1, y: 0 }

    const arenaWidth = arena.offsetWidth
    const arenaHeight = arena.offsetHeight
    const NUM_DIRECTIONS = 16 // Testa 16 direções radiais

    let bestDirection = { x: 0, y: 0 }
    let maxMinDistance = 0

    for (let i = 0; i < NUM_DIRECTIONS; i++) {
      const angle = (i * 2 * Math.PI) / NUM_DIRECTIONS
      const testDirection = {
        x: Math.cos(angle),
        y: Math.sin(angle)
      }

      let minDistanceInDirection = Infinity

      // 1. Distância até Paredes nesta direção
      if (testDirection.x > 0) {
         const dist = (arenaWidth - currentPos.x - imageSize) / testDirection.x
         minDistanceInDirection = Math.min(minDistanceInDirection, dist)
      }
      if (testDirection.x < 0) {
         const dist = (currentPos.x - BOUNDARY_PADDING) / -testDirection.x
         minDistanceInDirection = Math.min(minDistanceInDirection, dist)
      }
      if (testDirection.y > 0) {
         const dist = (arenaHeight - currentPos.y - imageSize) / testDirection.y
         minDistanceInDirection = Math.min(minDistanceInDirection, dist)
      }
      if (testDirection.y < 0) {
         const dist = (currentPos.y - BOUNDARY_PADDING) / -testDirection.y
         minDistanceInDirection = Math.min(minDistanceInDirection, dist)
      }

      // 2. Distância até Outras Bolinhas nesta direção
      Object.entries(allPositions || {}).forEach(([username, otherPos]) => {
        if (username === profile.username || !otherPos) return

        const dx = otherPos.x - currentPos.x
        const dy = otherPos.y - currentPos.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Vetor normalizado apontando para a outra bolinha
        const directionToOther = { x: dx / distance, y: dy / distance }
        // Produto escalar para saber se a outra bolinha está na direção que estamos testando
        const dotProduct = testDirection.x * directionToOther.x + testDirection.y * directionToOther.y

        // Se estiver num cone de visão à frente (> 0.3), considera a distância
        if (dotProduct > 0.3) {
          minDistanceInDirection = Math.min(minDistanceInDirection, distance)
        }
      })

      // Escolhe a direção que tem o maior espaço livre
      if (minDistanceInDirection > maxMinDistance) {
        maxMinDistance = minDistanceInDirection
        bestDirection = testDirection
      }
    }

    // Se estiver tudo bloqueado, escolhe aleatório
    if (maxMinDistance === 0) {
      const randomAngle = Math.random() * Math.PI * 2
      bestDirection = {
        x: Math.cos(randomAngle),
        y: Math.sin(randomAngle)
      }
    }

    return bestDirection
  }

  // ==========================================
  // INICIALIZAÇÃO
  // ==========================================
  useEffect(() => {
    if (!containerRef.current) return
    const arena = containerRef.current.parentElement
    if (!arena) return
    const arenaWidth = arena.offsetWidth
    const arenaHeight = arena.offsetHeight

    if (!isInitializedRef.current) {
      // Tenta encontrar uma posição inicial livre de colisão
      let initialX = 0, initialY = 0, attempts = 0
      
      do {
        initialX = BOUNDARY_PADDING + Math.random() * (arenaWidth - imageSize - BOUNDARY_PADDING * 2)
        initialY = BOUNDARY_PADDING + Math.random() * (arenaHeight - imageSize - BOUNDARY_PADDING * 2)
        attempts++
      } while (
        attempts < 50 && 
        Object.entries(allPositions || {}).some(([username, pos]) => 
          username !== profile.username && pos && checkCollision({ x: initialX, y: initialY }, pos, imageSize, pos.size || imageSize)
        )
      )

      setPosition({ x: initialX, y: initialY })
      updatePosition(profile.username, { x: initialX, y: initialY }, imageSize)

      // Define velocidade inicial
      const baseSpeed = profile.isVerified ? 0.8 : 0.6 // Verificados são mais rápidos
      const direction = findBestDirection({ x: initialX, y: initialY })
      
      velocityRef.current = {
        x: direction.x * baseSpeed,
        y: direction.y * baseSpeed
      }

      isInitializedRef.current = true
    }

    // ==========================================
    // LOOP DE ANIMAÇÃO
    // ==========================================
    const animate = () => {
      if (isHovered) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      setPosition(prev => {
        // 1️⃣ MOVIMENTO LINEAR
        let newX = prev.x + velocityRef.current.x
        let newY = prev.y + velocityRef.current.y

        let needsNewDirection = false
        const currentTime = Date.now()

        // 2️⃣ COLISÃO COM PAREDES (COM COOLDOWN)
        const timeSinceWallCollision = currentTime - lastWallCollisionTime.current
        const canCheckWallCollision = timeSinceWallCollision > WALL_COLLISION_COOLDOWN

        if (canCheckWallCollision) {
          let hitWall = false
          // Parede Esquerda/Direita
          if (newX <= BOUNDARY_PADDING || newX >= arenaWidth - imageSize - BOUNDARY_PADDING) {
            newX = Math.max(BOUNDARY_PADDING, Math.min(newX, arenaWidth - imageSize - BOUNDARY_PADDING))
            hitWall = true
            needsNewDirection = true
          }
          // Parede Cima/Baixo
          if (newY <= BOUNDARY_PADDING || newY >= arenaHeight - imageSize - BOUNDARY_PADDING) {
            newY = Math.max(BOUNDARY_PADDING, Math.min(newY, arenaHeight - imageSize - BOUNDARY_PADDING))
            hitWall = true
            needsNewDirection = true
          }
          
          if (hitWall) {
            lastWallCollisionTime.current = currentTime
          }
        } else {
          // Em cooldown: Apenas mantém dentro, sem disparar mudança de direção
          newX = Math.max(BOUNDARY_PADDING, Math.min(newX, arenaWidth - imageSize - BOUNDARY_PADDING))
          newY = Math.max(BOUNDARY_PADDING, Math.min(newY, arenaHeight - imageSize - BOUNDARY_PADDING))
        }

        const newPos = { x: newX, y: newY }

        // 3️⃣ COLISÃO COM OUTRAS BOLINHAS (COM COOLDOWN INDIVIDUAL)
        if (!needsNewDirection) {
          Object.entries(allPositions || {}).forEach(([username, otherPos]) => {
            if (username === profile.username || !otherPos) return

            // Pega o cooldown específico para esta bolinha
            const lastCollision = collisionCooldowns.current[username] || 0
            const canCollideWithThisBall = (currentTime - lastCollision) > COLLISION_COOLDOWN

            // Pega o tamanho real da outra bolinha
            const otherSize = otherPos.size || imageSize

            if (checkCollision(newPos, otherPos, imageSize, otherSize)) {
              // EMPURRÃO FÍSICO (Sempre acontece para evitar sobreposição visual)
              const dx = newPos.x - otherPos.x
              const dy = newPos.y - otherPos.y
              const distance = Math.sqrt(dx * dx + dy * dy)

              if (distance > 0) {
                const radius1 = imageSize / 2
                const radius2 = otherSize / 2
                // Quanto elas estão sobrepostas?
                const overlap = (radius1 + radius2) - distance

                if (overlap > 0) {
                    const pushDistance = overlap / 2 + 2 // Empurra metade da sobreposição + margem
                    newPos.x += (dx / distance) * pushDistance
                    newPos.y += (dy / distance) * pushDistance
                }
              }

              // MUDANÇA DE DIREÇÃO (Só acontece se o cooldown permitir)
              if (canCollideWithThisBall) {
                  needsNewDirection = true
                  collisionCooldowns.current[username] = currentTime // Marca cooldown para essa bolinha
              }
            }
          })
        }

        // 4️⃣ RECALCULA DIREÇÃO (se necessário)
        if (needsNewDirection) {
          const baseSpeed = profile.isVerified ? 0.8 : 0.6
          const bestDirection = findBestDirection(newPos)

          velocityRef.current = {
            x: bestDirection.x * baseSpeed,
            y: bestDirection.y * baseSpeed
          }
        }

        // Atualiza posição global para que outras bolinhas saibam onde estou
        updatePosition(profile.username, newPos, imageSize)
        return newPos
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [isHovered, allPositions, profile.username, updatePosition, imageSize, profile.isVerified])

  // ==========================================
  // TOOLTIP INTELIGENTE (mantido igual)
  // ==========================================
  useEffect(() => {
    if (!isHovered || !containerRef.current) return
    const arena = containerRef.current.parentElement
    if (!arena) return
    const arenaWidth = arena.offsetWidth
    const tooltipHeight = 80
    const tooltipWidth = 150

    let vertical = 'top'
    let horizontal = 'center'

    if (position.y < tooltipHeight) vertical = 'bottom'
    if (position.x < tooltipWidth / 2) horizontal = 'left'
    else if (position.x > arenaWidth - imageSize - tooltipWidth / 2) horizontal = 'right'

    setTooltipPosition({ vertical, horizontal })
  }, [isHovered, position, imageSize])

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

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div 
      ref={containerRef} 
      className="profile-pic-container" 
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`, 
        width: `${imageSize}px`, 
        height: `${imageSize}px`, 
        position: 'absolute', 
        touchAction: 'none',
        transition: 'none' // Remove transições CSS para movimento fluido
      }} 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 2000)}
    >
      {isAdmin && (
        <div 
          className="admin-crown" 
          style={{
            position: 'absolute', 
            top: '-5px', 
            right: '-5px', 
            fontSize: `${imageSize * 0.25}px`, 
            zIndex: 10
          }}
        >
          👑
        </div>
      )}

      {isHovered && (
        <div className={getTooltipClass()} style={{zIndex: 999, pointerEvents: 'none'}}>
          <div className="profile-username" style={{fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px'}}>
            @{profile.username}{isAdmin && <span style={{color: '#FFD700', fontWeight: 'bold', marginLeft: '4px'}}>ADM</span>}
          </div>
          <div className="profile-followers" style={{fontSize: '12px'}}>{formatNumber(profile.followers)} seguidores</div>
        </div>
      )}

      <img 
        src={profile.profilePic} 
        alt={profile.username} 
        className="profile-pic" 
        onError={(e) => onImageError(e, profile.username)}
        onClick={(e) => { e.stopPropagation(); onProfileClick(profile) }} 
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
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
    <div className="modal-overlay" onClick={handleOverlayClick} style={{
      padding: '20px',
      overflowY: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="modal-content" style={{
        width: '100%',
        maxWidth: '450px',
        maxHeight: '90vh',
        overflowY: 'auto',
        margin: '0 auto'
      }}>
        <button 
          className="modal-close" 
          onClick={onClose}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            padding: 0
          }}
        >×</button>
        
        <div className="modal-header-compact" style={{padding: '25px 20px 20px'}}>
          <img 
            src={profile.profilePic} 
            alt={profile.username} 
            className="modal-profile-pic-small" 
            onError={(e) => onImageError(e, profile.username)}
            loading="lazy"
            style={{
              width: '70px',
              height: '70px',
              flexShrink: 0
            }}
          />
          <div className="modal-user-info" style={{flex: 1, minWidth: 0, overflow: 'hidden'}}>
            <div className="modal-username" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%'
            }}>
              @{profile.username}{profile.isCreator && <span style={{marginLeft: '5px'}}>👑</span>}
            </div>
            <div className="modal-fullname" style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%'
            }}>
              {profile.fullName || profile.username}
            </div>
          </div>
        </div>

        <div className="modal-stats" style={{
          display: 'flex',
          justifyContent: 'space-around',
          padding: '20px 10px',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div className="stat-item" style={{
            textAlign: 'center',
            minWidth: '80px',
            flex: '1 1 auto'
          }}>
            <div className="stat-number" style={{wordBreak: 'break-word'}}>
              {formatNumber(profile.posts || 0)}
            </div>
            <div className="stat-label">Posts</div>
          </div>
          <div className="stat-item" style={{
            textAlign: 'center',
            minWidth: '80px',
            flex: '1 1 auto'
          }}>
            <div className="stat-number" style={{wordBreak: 'break-word'}}>
              {formatNumber(profile.followers || 0)}
            </div>
            <div className="stat-label">Seguidores</div>
          </div>
          <div className="stat-item" style={{
            textAlign: 'center',
            minWidth: '80px',
            flex: '1 1 auto'
          }}>
            <div className="stat-number" style={{wordBreak: 'break-word'}}>
              {formatNumber(profile.following || 0)}
            </div>
            <div className="stat-label">Seguindo</div>
          </div>
        </div>

        <div className="modal-bio-section" style={{
          padding: '20px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <div className="modal-bio-label">Biografia</div>
          {profile.biography ? (
            <div className="modal-bio-text" style={{
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              {profile.biography}
            </div>
          ) : (
            <div className="modal-bio-empty">Nenhuma biografia disponível</div>
          )}
        </div>

        <a 
          href={`https://www.instagram.com/${profile.username}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="modal-link-btn"
          style={{
            display: 'block',
            margin: '0 20px 20px',
            padding: '14px',
            textAlign: 'center',
            minHeight: '48px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          📸 Ver no Instagram
        </a>
      </div>
    </div>
  )
}