import type { Metadata } from 'next'
export const metadata: Metadata = { title: '5GATES Carousel', description: '5GATES Instagram Carousel Builder' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: '#0D0D0D', color: '#F0EDE8', fontFamily: "'Cairo',sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
