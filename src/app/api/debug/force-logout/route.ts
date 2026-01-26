import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * TEMPORARY DEBUG ENDPOINT - Force logout by clearing cookies
 * DELETE THIS FILE AFTER USE!
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Clear NextAuth cookies
    cookieStore.delete('next-auth.session-token')
    cookieStore.delete('__Secure-next-auth.session-token')
    cookieStore.delete('next-auth.csrf-token')
    cookieStore.delete('__Host-next-auth.csrf-token')
    
    return NextResponse.json({
      success: true,
      message: 'All auth cookies cleared. Please login again.'
    })
  } catch (error) {
    console.error('Error clearing cookies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
