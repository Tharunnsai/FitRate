"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function FloatingSearchButton() {
  const router = useRouter()
  
  return (
    <Button
      onClick={() => router.push('/discover')}
      className="md:hidden fixed bottom-6 right-6 rounded-full w-12 h-12 shadow-lg z-50 flex items-center justify-center"
    >
      <Search className="h-5 w-5" />
      <span className="sr-only">Search</span>
    </Button>
  )
} 