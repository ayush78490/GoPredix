'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAPIHealth } from '@/lib/api-client'

export default function APITestPage() {
    const [results, setResults] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    const testAPIs = async () => {
        setIsLoading(true)
        try {
            const health = await getAPIHealth()
            setResults(health)
        } catch (error) {
            console.error('Health check failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto p-8">
            <Card className="p-6 max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">API Fallback Test</h1>

                <div className="space-y-4">
                    <Button
                        onClick={testAPIs}
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? 'Testing APIs...' : 'Test API Health'}
                    </Button>

                    {results && (
                        <div className="space-y-4">
                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">
                                    Vercel API {results.vercel.healthy ? '✅' : '❌'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Response Time: {results.vercel.responseTime}ms
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Status: {results.vercel.healthy ? 'Healthy' : 'Unhealthy'}
                                </p>
                            </div>

                            <div className="p-4 border rounded-lg">
                                <h3 className="font-semibold mb-2">
                                    Cloudflare API {results.cloudflare.healthy ? '✅' : '❌'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Response Time: {results.cloudflare.responseTime}ms
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Status: {results.cloudflare.healthy ? 'Healthy' : 'Unhealthy'}
                                </p>
                            </div>

                            <div className="p-4 bg-blue-950/20 border border-blue-500 rounded-lg">
                                <p className="text-sm">
                                    <strong>Recommended:</strong>{' '}
                                    {results.vercel.healthy && results.cloudflare.healthy
                                        ? 'Use Vercel (both available, Vercel has duplicate checking)'
                                        : results.vercel.healthy
                                            ? 'Use Vercel (Cloudflare unavailable)'
                                            : results.cloudflare.healthy
                                                ? 'Use Cloudflare fallback (Vercel unavailable)'
                                                : 'Both APIs unavailable'
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
