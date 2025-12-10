import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
    request: NextRequest,
    { params }: { params: { expenseId: string } }
) {
    try {
        const { expenseId } = params
        const backendUrl = `http://localhost:4000/api/descriptions/expense/${expenseId}`

        console.log(`📡 Descriptions (by expense) DELETE proxy: ${backendUrl}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(backendUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data = await response.json()

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status })
        }

        return NextResponse.json(data, { status: response.status })

    } catch (error: any) {
        console.error('Descriptions (by expense) DELETE proxy error:', error)
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timeout' }, { status: 504 })
        }
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
    }
}

