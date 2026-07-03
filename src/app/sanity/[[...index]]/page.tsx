import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import StudioComponent from './StudioComponent'

export const dynamic = 'force-dynamic'
export { metadata, viewport } from 'next-sanity/studio'

export default async function SanityStudioPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/login?error=Access%20denied.%20Administrators%20only.')
  }

  return <StudioComponent />
}
