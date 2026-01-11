import './globals.css'

export const metadata = {
  title: 'Instagram Followers',
  description: 'Veja seus seguidores do Instagram',
}

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}