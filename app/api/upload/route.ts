import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("filename")

  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 })
  }

  try {
    const blob = await put(`fitness-photos/${filename}`, request, {
      access: "public",
    })

    return NextResponse.json(blob)
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}

