"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  signIn: (email: string, password: string) => Promise<{ success: boolean, error?: any }>
  signUp: (email: string, password: string) => Promise<{ success: boolean, error?: any }>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
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

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      router.push('/gallery')
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }
  
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      // After signup, redirect to profile to complete setup
      router.push('/profile')
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }
  
  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  
  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 