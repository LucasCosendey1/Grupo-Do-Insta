// ==========================================
// DIAGNÓSTICO: Por que BIO/POSTS/SEGUINDO não aparecem?
// ==========================================
// 
// INSTRUÇÕES:
// 1. Adicione este código TEMPORARIAMENTE na API
// 2. Acesse o grupo no navegador
// 3. Veja os logs no console do Vercel
// 4. Depois REMOVA este código
//

// ==========================================
// ADICIONE ISTO NO ARQUIVO:
// app/api/grupos/[id]/route.js
// ==========================================

// Logo DEPOIS desta linha:
// const membrosResult = await sql`SELECT ... FROM grupo_membros ...`

// ADICIONE ESTE BLOCO:
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🔍 DIAGNÓSTICO: Dados do banco')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Total de membros encontrados:', membrosResult.rows.length)
console.log('')

membrosResult.rows.forEach((m, index) => {
  console.log(`👤 MEMBRO ${index + 1}: ${m.username}`)
  console.log('   ├─ Full Name:', m.full_name)
  console.log('   ├─ Followers:', m.followers, '(tipo:', typeof m.followers, ')')
  console.log('   ├─ Following:', m.following, '(tipo:', typeof m.following, ')')
  console.log('   ├─ Posts:', m.posts, '(tipo:', typeof m.posts, ')')
  console.log('   ├─ Biography:', m.biography ? `"${m.biography.substring(0, 50)}..."` : 'VAZIO')
  console.log('   ├─ É Criador?', m.username.toLowerCase() === criadorUsername.toLowerCase() ? '👑 SIM' : 'não')
  console.log('')
})

// Logo DEPOIS desta linha:
// const profiles = membrosResult.rows.map((m) => { ... })

// ADICIONE ESTE BLOCO:
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📦 DIAGNÓSTICO: Dados mapeados (profiles)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Total de profiles:', profiles.length)
console.log('')

profiles.forEach((p, index) => {
  console.log(`👤 PROFILE ${index + 1}: ${p.username}`)
  console.log('   ├─ Followers:', p.followers, '✅')
  console.log('   ├─ Following:', p.following, p.following === 0 ? '❌ ZERO!' : '✅')
  console.log('   ├─ Posts:', p.posts, p.posts === 0 ? '❌ ZERO!' : '✅')
  console.log('   ├─ Biography:', p.biography ? `✅ "${p.biography.substring(0, 30)}..."` : '❌ VAZIO!')
  console.log('   ├─ isCreator:', p.isCreator ? '👑 SIM' : 'não')
  console.log('')
})

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🎯 DIAGNÓSTICO: Objeto final retornado')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Grupo ID:', grupoIdReal)
console.log('Grupo Nome:', grupo.name)
console.log('Criador:', criadorUsername)
console.log('Número de profiles:', profiles.length)
console.log('')
console.log('JSON completo do primeiro profile:')
console.log(JSON.stringify(profiles[0], null, 2))
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

// ==========================================
// DIAGNÓSTICO NO FRONTEND
// ==========================================

// ADICIONE ISTO NO ARQUIVO:
// app/grupo/[id]/page.tsx
// 
// Dentro do useEffect que carrega o grupo, DEPOIS de:
// const data = await response.json()

// ADICIONE ESTE BLOCO:
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🖥️ FRONTEND: Dados recebidos da API')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Success?', data.success)
console.log('Tem profiles?', data.group?.profiles ? 'SIM' : 'NÃO')
console.log('Quantidade:', data.group?.profiles?.length || 0)
console.log('')

if (data.group?.profiles && data.group.profiles.length > 0) {
  console.log('👤 PRIMEIRO PROFILE (provavelmente criador):')
  console.log('   ├─ Username:', data.group.profiles[0].username)
  console.log('   ├─ Followers:', data.group.profiles[0].followers)
  console.log('   ├─ Following:', data.group.profiles[0].following, data.group.profiles[0].following === 0 ? '❌ ZERO!' : '✅')
  console.log('   ├─ Posts:', data.group.profiles[0].posts, data.group.profiles[0].posts === 0 ? '❌ ZERO!' : '✅')
  console.log('   ├─ Biography:', data.group.profiles[0].biography ? `✅ "${data.group.profiles[0].biography.substring(0, 30)}..."` : '❌ VAZIO!')
  console.log('   ├─ isCreator:', data.group.profiles[0].isCreator ? '👑 SIM' : 'não')
  console.log('')
  console.log('JSON completo:')
  console.log(JSON.stringify(data.group.profiles[0], null, 2))
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

// DEPOIS de: setProfiles(data.group.profiles || [])
// ADICIONE:
console.log('✅ Profiles setados no estado!')
console.log('Conferir estado:', profiles)

// ==========================================
// DIAGNÓSTICO NO MODAL
// ==========================================

// ADICIONE ISTO NO ARQUIVO:
// app/grupo/[id]/page.tsx
//
// Dentro da função ProfileModal, no começo do return
// ANTES de: return (<div className="modal-overlay"...

// ADICIONE ESTE BLOCO:
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🪟 MODAL: Profile recebido')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('Username:', profile.username)
console.log('Followers:', profile.followers)
console.log('Following:', profile.following, profile.following === 0 ? '❌ ZERO!' : '✅')
console.log('Posts:', profile.posts, profile.posts === 0 ? '❌ ZERO!' : '✅')
console.log('Biography:', profile.biography ? `✅ "${profile.biography.substring(0, 30)}..."` : '❌ VAZIO!')
console.log('')
console.log('Objeto completo:')
console.log(JSON.stringify(profile, null, 2))
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')