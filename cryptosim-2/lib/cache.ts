import fs from 'fs/promises'
import path from 'path'

interface CacheEntry {
  timestamp: number
  data: any
}

interface CacheConfig {
  // Cache duration in milliseconds
  '1D': number
  '1W': number
  '1M': number
  '1Y': number
}

const CACHE_DIR = path.join(process.cwd(), 'data/cache')
const CACHE_DURATION: CacheConfig = {
  '1D': 5 * 60 * 1000,      // 5 minutes for 1D data
  '1W': 30 * 60 * 1000,     // 30 minutes for 1W data
  '1M': 6 * 60 * 60 * 1000, // 6 hours for 1M data
  '1Y': 24 * 60 * 60 * 1000 // 24 hours for 1Y data
}

export async function initCache() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (error) {
    console.error('Error initializing cache directory:', error)
  }
}

export async function getCachedData(symbol: string, timeRange: string): Promise<any | null> {
  try {
    const cacheFile = path.join(CACHE_DIR, `${symbol}_${timeRange}.json`)
    const data = await fs.readFile(cacheFile, 'utf-8')
    const cache: CacheEntry = JSON.parse(data)

    // Check if cache is still valid
    const now = Date.now()
    const maxAge = CACHE_DURATION[timeRange as keyof CacheConfig]
    
    if (now - cache.timestamp <= maxAge) {
      return cache.data
    }
    
    // If cache is expired, delete the file
    await fs.unlink(cacheFile)
    return null
  } catch (error) {
    // If file doesn't exist or other error, return null
    return null
  }
}

export async function setCachedData(symbol: string, timeRange: string, data: any): Promise<void> {
  try {
    const cacheFile = path.join(CACHE_DIR, `${symbol}_${timeRange}.json`)
    const cache: CacheEntry = {
      timestamp: Date.now(),
      data
    }
    await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2))
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

// Simple function to clean up a single symbol's expired cache files
export async function cleanupSymbolCache(symbol: string): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR)
    const now = Date.now()

    for (const file of files) {
      // Only process files for the current symbol
      if (!file.startsWith(symbol + '_')) continue;

      const filePath = path.join(CACHE_DIR, file)
      try {
        const data = await fs.readFile(filePath, 'utf-8')
        const cache: CacheEntry = JSON.parse(data)
        const timeRange = file.replace('.json', '').split('_')[1]
        const maxAge = CACHE_DURATION[timeRange as keyof CacheConfig]

        if (now - cache.timestamp > maxAge) {
          await fs.unlink(filePath)
        }
      } catch (error) {
        // If file is corrupted or can't be read, delete it
        await fs.unlink(filePath)
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error)
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR)
    const now = Date.now()

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file)
      try {
        const data = await fs.readFile(filePath, 'utf-8')
        const cache: CacheEntry = JSON.parse(data)
        const [_, timeRange] = file.replace('.json', '').split('_')
        const maxAge = CACHE_DURATION[timeRange as keyof CacheConfig]

        if (now - cache.timestamp > maxAge) {
          await fs.unlink(filePath)
        }
      } catch (error) {
        await fs.unlink(filePath)
      }
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error)
  }
} 