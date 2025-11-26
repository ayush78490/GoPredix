import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const marketId = searchParams.get('marketId')
        const paymentToken = searchParams.get('paymentToken')

        // Validate required parameters
        if (marketId === null || marketId === undefined) {
            return NextResponse.json(
                { error: 'marketId query parameter is required' },
                { status: 400 }
            )
        }

        if (!paymentToken || !['BNB', 'PDX'].includes(paymentToken)) {
            return NextResponse.json(
                { error: 'paymentToken must be either BNB or PDX' },
                { status: 400 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Query market creation data
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .eq('market_id', parseInt(marketId))
            .eq('payment_token', paymentToken)
            .single()

        if (error) {
            // Not found is not an error - just return null
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    success: true,
                    data: null,
                })
            }

            console.error('Supabase error fetching market:', error)
            return NextResponse.json(
                { error: 'Failed to fetch market data', details: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data: data || null,
        })
    } catch (error: any) {
        console.error('Error fetching market creation date:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
