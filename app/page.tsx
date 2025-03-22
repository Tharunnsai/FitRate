"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Star, Upload, Users } from "lucide-react"

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  // Redirect authenticated users to gallery
  useEffect(() => {
    if (user) {
      router.push('/gallery')
    }
  }, [user, router])
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-background">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Share Your Fitness Journey
                </h1>
                <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                  Upload progress photos, get feedback from the community, and track your transformation over time.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button asChild size="lg">
                  <Link href="/gallery">
                    Explore Gallery
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/signup">Create Account</Link>
                </Button>
              </div>
            </div>
            <img
              src="/hero-image.jpg"
              alt="Fitness progress"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              width={500}
              height={310}
            />
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Our platform makes it easy to document your fitness journey and get valuable feedback
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Upload Photos</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Share your progress photos with titles and descriptions
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Get Rated</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Receive honest ratings and feedback from the fitness community
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Connect</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Build a network of fitness enthusiasts and track your progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

