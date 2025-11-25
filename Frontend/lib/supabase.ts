import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface UserProfile {
    id: string
    wallet_address: string
    twitter_id?: string | null
    twitter_username?: string | null
    twitter_name?: string | null
    twitter_avatar_url?: string | null
    created_at: string
    updated_at: string
}

// Helper functions
export async function getUserProfileByWallet(walletAddress: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

    if (error) {
        console.error('Error fetching user profile:', error)
        return null
    }

    return data
}

export async function getUserProfileByTwitterId(twitterId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('twitter_id', twitterId)
        .single()

    if (error) {
        console.error('Error fetching user profile by Twitter ID:', error)
        return null
    }

    return data
}

export async function createOrUpdateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .upsert(
            {
                ...profile,
                wallet_address: profile.wallet_address?.toLowerCase(),
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'wallet_address',
            }
        )
        .select()
        .single()

    if (error) {
        console.error('Error creating/updating user profile:', error)
        return null
    }

    return data
}

export async function linkTwitterToWallet(
    walletAddress: string,
    twitterData: {
        twitter_id: string
        twitter_username: string
        twitter_name: string
        twitter_avatar_url: string
    }
): Promise<UserProfile | null> {
    // Check if Twitter account is already linked to another wallet
    const existingProfile = await getUserProfileByTwitterId(twitterData.twitter_id)

    if (existingProfile && existingProfile.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('This Twitter account is already linked to another wallet')
    }

    return createOrUpdateUserProfile({
        wallet_address: walletAddress.toLowerCase(),
        ...twitterData,
    })
}

export async function unlinkTwitterFromWallet(walletAddress: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_profiles')
        .update({
            twitter_id: null,
            twitter_username: null,
            twitter_name: null,
            twitter_avatar_url: null,
            updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', walletAddress.toLowerCase())

    if (error) {
        console.error('Error unlinking Twitter:', error)
        return false
    }

    return true
}
