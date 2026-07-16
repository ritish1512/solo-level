import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sololevelingguider.vercel.app/'
const siteName = 'Solo Leveling'
const siteDescription =
  'Manage tasks, track habits, visualize goals, organize college coursework, track finances, and structure freelancing projects with your personalized second brain.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Personal Productivity Coach & Dashboard`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  keywords: [
    'productivity dashboard',
    'second brain',
    'habit tracker',
    'task manager',
    'college tracker',
    'project manager',
    'finance tracker',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName,
    title: `${siteName} | Personal Productivity Coach & Dashboard`,
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} | Personal Productivity Coach & Dashboard`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'productivity',
  manifest: '/manifest.webmanifest',
}

import PwaRegister from '@/components/PwaRegister'
import OfflineSyncBanner from '@/components/dashboard/OfflineSyncBanner'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: siteName,
        url: siteUrl,
        description: siteDescription,
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: 'en-US',
      },
      {
        '@type': 'SoftwareApplication',
        name: siteName,
        applicationCategory: 'ProductivityApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: siteDescription,
      },
    ],
  }

  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground transition-colors duration-300" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Providers>
          <PwaRegister />
          {children}
          <OfflineSyncBanner />
        </Providers>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  )
}
