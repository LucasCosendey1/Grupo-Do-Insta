// lib/slug-utils.ts

/**
 * Gera slug amigável a partir do nome do grupo
 * Remove acentos, caracteres especiais, converte para lowercase
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')                    // Decompor acentos
    .replace(/[\u0300-\u036f]/g, '')     // Remover diacríticos
    .replace(/[^\w\s-]/g, '')            // Remover caracteres especiais
    .trim()
    .replace(/\s+/g, '-')                // Substituir espaços por hífen
    .replace(/-+/g, '-')                 // Remover hífens duplicados
    .substring(0, 60)                    // Limitar tamanho
}

/**
 * Gera prefixo aleatório único (4-6 caracteres)
 * Usa base36 (0-9, a-z) para URLs curtas e legíveis
 */
export function generatePrefix(length: number = 4): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
}

/**
 * Gera slug completo garantindo unicidade
 */
export async function generateUniqueSlug(
  name: string, 
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  const baseSlug = generateSlug(name)
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = generatePrefix(attempt === 0 ? 4 : 5 + attempt)
    const slug = `${prefix}-${baseSlug}`
    
    const exists = await checkExists(slug)
    
    if (!exists) {
      return slug
    }
    
    console.log(`⚠️ Slug ${slug} já existe, tentando novamente...`)
  }
  
  // Fallback: usar timestamp se todas as tentativas falharem
  const timestamp = Date.now().toString(36)
  return `${timestamp}-${baseSlug}`
}

/**
 * Extrai ID do grupo a partir do slug
 * Suporta formato antigo (G-123-abc) e novo (abc-nome)
 */
export function extractGroupIdFromSlug(slug: string): string {
  // Formato antigo: G-1234567890-abc123
  if (slug.startsWith('G-')) {
    return slug
  }
  
  // Formato novo: abc-nome-do-grupo
  // O ID completo É o slug
  return slug
}

/**
 * Valida se slug está no formato correto
 */
export function isValidSlug(slug: string): boolean {
  // Formato antigo
  if (slug.startsWith('G-')) {
    return /^G-\d+-[a-zA-Z0-9]+$/.test(slug)
  }
  
  // Formato novo: {prefixo}-{slug}
  return /^[a-z0-9]{4,6}-[a-z0-9-]+$/.test(slug)
}