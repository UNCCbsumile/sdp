import { NextResponse } from "next/server"
import { clearExpiredCache } from "@/lib/cache"

// This endpoint can be called by a cron job to clean up expired cache files
export async function GET() {
  try {
    await clearExpiredCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to clear expired cache" },
      { status: 500 }
    )
  }
} 