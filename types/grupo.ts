// types/grupo.ts

export interface Group {
  id: string          // ID original (pode ser removido no futuro)
  slug: string        // Novo identificador único
  name: string
  icon: {
    emoji: string
    name: string
  }
  creator: string
  memberCount: number
  createdAt: string
  updatedAt: string
}