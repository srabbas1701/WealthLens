'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          router.push('/login?error=magic_link_invalid')
          return
        }

        if (data.session) {
          router.push('/dashboard')
        } else {
          router.push('/login?error=magic_link_invalid')
        }
      } catch {
        router.push('/login?error=magic_link_invalid')
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing you in...</p>
    </div>
  )
}
