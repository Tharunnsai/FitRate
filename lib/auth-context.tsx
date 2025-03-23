"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

export type AuthContextType = {
  user: User | null | undefined
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: undefined,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ success: true }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check for user session on mount
  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      setLoading(false)
    }
    
    getUser()
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Handle auth-required redirects
  useEffect(() => {
    if (loading) return
    
    const authRequiredPages = ['/upload', '/profile']
    const authPages = ['/login', '/signup']
    const publicPages = ['/', '/gallery']
    
    if (!user && authRequiredPages.some(page => pathname.startsWith(page))) {
      // Redirect to login if trying to access auth-required pages
      router.push('/login')
    } else if (user && authPages.includes(pathname)) {
      // Redirect to gallery if already logged in and trying to access auth pages
      router.push('/gallery')
    } else if (user && pathname === '/') {
      // Redirect to gallery if authenticated user tries to access the landing page
      router.push('/gallery')
    } else if (!publicPages.includes(pathname) && !authRequiredPages.some(page => pathname.startsWith(page)) && !authPages.includes(pathname)) {
      // For any other non-existent routes, redirect based on auth status
      router.push(user ? '/gallery' : '/')
    }
  }, [user, loading, pathname, router])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }
  
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      router.push('/gallery')
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }
  
  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  
  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 