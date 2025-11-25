import { NextRequest, NextResponse } from 'next/server'
import { linkTwitterToWallet } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { walletAddress, twitterData } = body

        if (!walletAddress || !twitterData) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate Twitter data
        if (!twitterData.twitter_id || !twitterData.twitter_username) {
            return NextResponse.json(
                { error: 'Invalid Twitter data' },
                { status: 400 }
            )
        }

        // Link Twitter account to wallet
        const profile = await linkTwitterToWallet(walletAddress, twitterData)

        if (!profile) {
            return NextResponse.json(
                { error: 'Failed to link Twitter account' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, profile })
    } catch (error: any) {
        console.error('Error linking Twitter account:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
