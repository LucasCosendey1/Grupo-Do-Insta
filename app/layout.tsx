export const metadata = {
  title: 'Instagram Followers',
  description: 'Veja seus seguidores do Instagram',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}