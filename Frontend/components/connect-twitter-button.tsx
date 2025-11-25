"use client"

import { signIn, signOut, useSession } from 'next-auth/react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Twitter, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserProfile } from '@/lib/supabase'

export default function ConnectTwitterButton() {
    const { data: session, status } = useSession()
    const { address: walletAddress } = useAccount()
    const [isLinking, setIsLinking] = useState(false)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Fetch user profile when wallet is connected
    useEffect(() => {
        if (walletAddress) {
            fetchUserProfile()
        }
    }, [walletAddress])

    // Link Twitter account after OAuth success
    useEffect(() => {
        if (session?.twitter && walletAddress && !userProfile?.twitter_id) {
            linkTwitterAccount()
        }
    }, [session, walletAddress])

    const fetchUserProfile = async () => {
        if (!walletAddress) return

        try {
            const response = await fetch(`/api/user/profile?wallet=${walletAddress}`)
            if (response.ok) {
                const data = await response.json()
                setUserProfile(data.profile)
            }
        } catch (error) {
            console.error('Error fetching profile:', error)
        }
    }

    const linkTwitterAccount = async () => {
        if (!session?.twitter || !walletAddress) return

        setIsLinking(true)
        setError(null)

        try {
            const response = await fetch('/api/user/link-twitter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress,
                    twitterData: {
                        twitter_id: session.twitter.id,
                        twitter_username: session.twitter.username,
                        twitter_name: session.twitter.name,
                        twitter_avatar_url: session.twitter.profile_image_url,
                    },
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to link Twitter account')
            }

            setUserProfile(data.profile)
            await signOut({ redirect: false }) // Clear OAuth session after linking
        } catch (error: any) {
            console.error('Error linking Twitter:', error)
            setError(error.message)
        } finally {
            setIsLinking(false)
        }
    }

    const handleConnect = () => {
        if (!walletAddress) {
            setError('Please connect your wallet first')
            return
        }
        signIn('twitter')
    }

    // If Twitter is already linked
    if (userProfile?.twitter_username) {
        return (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                <img
                    src={userProfile.twitter_avatar_url || ''}
                    alt={userProfile.twitter_username}
                    className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                    <p className="font-semibold">{userProfile.twitter_name}</p>
                    <p className="text-sm text-muted-foreground">@{userProfile.twitter_username}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-green-500 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Linked
                    </div>
                </div>
            </div>
        )
    }

    // If linking in progress
    if (isLinking || status === 'loading') {
        return (
            <Button disabled className="w-full gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Linking Twitter Account...
            </Button>
        )
    }

    // Connect button
    return (
        <div className="space-y-2">
            <Button
                onClick={handleConnect}
                disabled={!walletAddress}
                className="w-full gap-2 bg-blue-500 hover:bg-blue-600"
            >
                <Twitter className="w-4 h-4" />
                Connect X Account
            </Button>
            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}
            {!walletAddress && (
                <p className="text-sm text-muted-foreground">Connect your wallet first</p>
            )}
        </div>
    )
}
