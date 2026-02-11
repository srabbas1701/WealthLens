'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        router.push(
          `/login?error=${encodeURIComponent(
            "Your login link is invalid or expired. Please request a new one."
          )}`
        )
        return
      }

      if (data.session) {
        router.push('/dashboard')
      } else {
        router.push('/login')
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
