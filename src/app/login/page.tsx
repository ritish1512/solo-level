import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { callbackUrl?: string }
}) {
  const session = await auth()
  const callbackUrl = searchParams?.callbackUrl || '/dashboard'

  if (session?.user) {
    if (callbackUrl.startsWith('/admin') && session.user.role === 'admin') {
      redirect(callbackUrl)
    }

    redirect('/dashboard')
  }

  return <LoginForm />
}
