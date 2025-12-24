import { NextRequest, NextResponse } from 'next/server'

// GET /api/analytics - Proxy to backend analytics API for performance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const backendUrl = `http://localhost:8080/api/analytics${queryString ? `?${queryString}` : ''}`

    console.log(`📊 Analytics proxy: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }))
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Analytics proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
