"use client"

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/header'

export default function AuthErrorPage() {
    const searchParams = useSearchParams()
    const [error, setError] = useState<string>('')
    const [errorDetails, setErrorDetails] = useState<string>('')

    useEffect(() => {
        const errorParam = searchParams?.get('error')

        if (errorParam) {
            setError(errorParam)

            // Provide user-friendly error messages
            switch (errorParam) {
                case 'OAuthCallback':
                    setErrorDetails(
                        'There was a problem connecting to Twitter. This usually happens when:\n' +
                        '• The callback URL in Twitter Developer Portal doesn\'t match\n' +
                        '• Your Twitter app permissions are incorrect\n' +
                        '• The authorization was cancelled'
                    )
                    break
                case 'OAuthSignin':
                    setErrorDetails(
                        'Failed to start the Twitter sign-in process. Please check:\n' +
                        '• Your Twitter app credentials are correct\n' +
                        '• The Twitter app is not suspended\n' +
                        '• Your internet connection is stable'
                    )
                    break
                case 'OAuthCreateAccount':
                    setErrorDetails(
                        'Could not create your account. This might be because:\n' +
                        '• An account with this Twitter profile already exists\n' +
                        '• There was a database error'
                    )
                    break
                case 'EmailCreateAccount':
                    setErrorDetails('Could not create account with this email address.')
                    break
                case 'Callback':
                    setErrorDetails(
                        'The authentication callback failed. Common causes:\n' +
                        '• Callback URL mismatch\n' +
                        '• Invalid state parameter\n' +
                        '• Session expired'
                    )
                    break
                case 'OAuthAccountNotLinked':
                    setErrorDetails(
                        'This Twitter account is already linked to another wallet address.'
                    )
                    break
                case 'EmailSignin':
                    setErrorDetails('Failed to send sign-in email.')
                    break
                case 'CredentialsSignin':
                    setErrorDetails('Invalid credentials provided.')
                    break
                case 'SessionRequired':
                    setErrorDetails('You must be signed in to access this page.')
                    break
                case 'Configuration':
                    setErrorDetails(
                        'Server configuration error. Please contact support if this persists.'
                    )
                    break
                default:
                    setErrorDetails(
                        'An unexpected error occurred during authentication. Please try again.'
                    )
            }
        } else {
            setError('Unknown Error')
            setErrorDetails('An unknown error occurred. Please try again.')
        }
    }, [searchParams])

    return (
        <main className="min-h-screen bg-background">
            <Header />

            <div className="max-w-2xl mx-auto px-4 py-16 mt-[10vh]">
                <Card className="p-8 backdrop-blur-sm bg-card/80">
                    <div className="flex flex-col items-center text-center space-y-6">
                        {/* Error Icon */}
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>

                        {/* Error Title */}
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold">Authentication Failed</h1>
                            <p className="text-muted-foreground">
                                We couldn't complete the Twitter authentication
                            </p>
                        </div>

                        {/* Error Code */}
                        {error && (
                            <div className="w-full p-4 rounded-lg bg-muted/50 border border-border">
                                <p className="text-sm font-mono text-muted-foreground">
                                    Error Code: <span className="text-foreground font-semibold">{error}</span>
                                </p>
                            </div>
                        )}

                        {/* Error Details */}
                        {errorDetails && (
                            <div className="w-full p-4 rounded-lg bg-red-500/5 border border-red-500/20 text-left">
                                <p className="text-sm text-foreground whitespace-pre-line">
                                    {errorDetails}
                                </p>
                            </div>
                        )}

                        {/* Troubleshooting Tips */}
                        <div className="w-full p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 text-left space-y-2">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Troubleshooting Tips
                            </h3>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Clear your browser cookies and cache</li>
                                <li>Try using an incognito/private window</li>
                                <li>Make sure you're authorizing the correct Twitter account</li>
                                <li>Check that your Twitter account is not suspended</li>
                                <li>Ensure you have a stable internet connection</li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Button
                                asChild
                                variant="default"
                                className="gap-2"
                            >
                                <Link href="/profile">
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </Link>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="gap-2"
                            >
                                <Link href="/">
                                    <ArrowLeft className="w-4 h-4" />
                                    Go Home
                                </Link>
                            </Button>
                        </div>

                        {/* Support Link */}
                        <p className="text-xs text-muted-foreground">
                            If the problem persists, please contact support or check the{' '}
                            <a
                                href="https://developer.twitter.com/en/support"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Twitter Developer Documentation
                            </a>
                        </p>
                    </div>
                </Card>
            </div>
        </main>
    )
}
