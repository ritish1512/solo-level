import { headers } from 'next/headers'
import dbConnect from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'

interface AuditLogOptions {
  action: string
  target?: string
  collectionName?: string
  details?: string
  result?: 'Success' | 'Failure'
}

/**
 * Parses user agent to extract browser and device info.
 */
function parseUserAgent(ua: string): { browser: string; device: string } {
  let browser = 'Unknown'
  let device = 'Desktop'

  if (!ua) return { browser, device }

  // Simple, light browser detection
  if (ua.includes('Firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('SamsungBrowser')) {
    browser = 'Samsung Browser'
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera'
  } else if (ua.includes('Edg') || ua.includes('Edge')) {
    browser = 'Edge'
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome'
  } else if (ua.includes('Safari')) {
    browser = 'Safari'
  }

  // Simple device type detection
  if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile'
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device = 'Tablet'
  }

  return { browser, device }
}

/**
 * Logs an administrative action to the AuditLog collection.
 * Designed to be called from Server Actions or Route Handlers.
 */
export async function logAdminAction(
  adminId: string,
  options: AuditLogOptions
): Promise<void> {
  try {
    await dbConnect()

    let ipAddress = '127.0.0.1'
    let browser = 'Unknown'
    let device = 'Desktop'

    try {
      const headerList = await headers()
      
      // Get IP Address
      const xForwardedFor = headerList.get('x-forwarded-for')
      if (xForwardedFor) {
        ipAddress = xForwardedFor.split(',')[0].trim()
      } else {
        ipAddress = headerList.get('x-real-ip') || '127.0.0.1'
      }

      // Get User Agent
      const userAgent = headerList.get('user-agent') || ''
      const parsed = parseUserAgent(userAgent)
      browser = parsed.browser
      device = parsed.device
    } catch (headerError) {
      console.warn('Could not extract headers in audit logging:', headerError)
    }

    await AuditLog.create({
      admin: adminId,
      action: options.action,
      target: options.target,
      collectionName: options.collectionName,
      details: options.details,
      ipAddress,
      browser,
      device,
      result: options.result || 'Success',
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
