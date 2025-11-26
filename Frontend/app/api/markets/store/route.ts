import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const {
            marketId,
            paymentToken,
            createdAt,
            blockNumber,
            transactionHash,
            creatorAddress,
            question,
            category,
            endTime
        } = body

        // Validate required fields
        if (marketId === undefined || marketId === null) {
            return NextResponse.json(
                { error: 'marketId is required' },
                { status: 400 }
            )
        }

        if (!paymentToken || !['BNB', 'PDX'].includes(paymentToken)) {
            return NextResponse.json(
                { error: 'paymentToken must be either BNB or PDX' },
                { status: 400 }
            )
        }

        if (!createdAt) {
            return NextResponse.json(
                { error: 'createdAt is required' },
                { status: 400 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Insert or update market record
        const { data, error } = await supabase
            .from('markets')
            .upsert(
                {
                    market_id: marketId,
                    payment_token: paymentToken,
                    created_at: createdAt,
                    block_number: blockNumber,
                    transaction_hash: transactionHash,
                    creator_address: creatorAddress,
                    question: question,
                    category: category,
                    end_time: endTime,
                },
                {
                    onConflict: 'market_id,payment_token',
                }
            )
            .select()

        if (error) {
            console.error('Supabase error storing market:', error)
            return NextResponse.json(
                { error: 'Failed to store market data', details: error.message },
                { status: 500 }
            )
        }

        console.log(`✅ Stored market creation data: ${paymentToken}-${marketId}`)

        return NextResponse.json({
            success: true,
            data: data?.[0] || null,
        })
    } catch (error: any) {
        console.error('Error storing market:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
