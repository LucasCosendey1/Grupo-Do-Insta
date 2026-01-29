// lib/official-profile.ts

/**
 * Perfil oficial invisível que é adicionado automaticamente a todos os grupos
 * Este perfil NÃO aparece na arena, contagem de membros ou estatísticas
 */

export const OFFICIAL_PROFILE = {
  username: 'instadogrupo.oficial',
  fullName: 'Insta do Grupo',
  profilePic: 'https://ui-avatars.com/api/?name=Insta+do+Grupo&size=200&background=00bfff&color=fff&bold=true',
  followers: 0,
  following: 0,
  posts: 0,
  biography: 'Perfil oficial do Insta do Grupo',
  isPrivate: false,
  isVerified: true,
  instagramId: 'instadogrupo.oficial'
} as const

/**
 * Verifica se um username é o perfil oficial
 */
export function isOfficialProfile(username: string): boolean {
  return username.toLowerCase() === OFFICIAL_PROFILE.username.toLowerCase()
}

/**
 * Filtra membros removendo o perfil oficial
 */
export function filterOfficialProfile<T extends { username: string }>(members: T[]): T[] {
  return members.filter(member => !isOfficialProfile(member.username))
}