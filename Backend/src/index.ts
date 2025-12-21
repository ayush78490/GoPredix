/**
 * Main Entry Point for Auto-Resolution System
 * 
 * Combines:
 * - Event listener (schedules new markets)
 * - Worker (processes scheduled jobs)
 * - Cleanup cron (catches missed markets)
 */

import { startWorker } from './services/resolution-worker'
import { startEventListener, backfillExistingMarkets } from './services/event-listener'
import { startCleanupCron } from './services/cleanup-cron'

async function main() {
    console.log('\n')
    console.log('╔═══════════════════════════════════════════════════════╗')
    console.log('║                                                       ║')
    console.log('║     🚀 Market Auto-Resolution System v2.0            ║')
    console.log('║     Event-Driven + Bull Queue + Redis                ║')
    console.log('║                                                       ║')
    console.log('╚═══════════════════════════════════════════════════════╝')
    console.log('\n')

    try {
        // 1. Start the worker (processes jobs)
        startWorker()

        // 2. Backfill existing markets
        await backfillExistingMarkets()

        // 3. Start event listener (schedules new markets)
        await startEventListener()

        // 4. Start cleanup cron (failsafe)
        startCleanupCron()

        console.log('\n✨ All services started successfully!')
        console.log('\n📍 Status:')
        console.log('   ✅ Worker: Processing jobs from queue')
        console.log('   ✅ Event Listener: Watching for new markets')
        console.log('   ✅ Cleanup Cron: Running hourly checks')
        console.log('\n')

    } catch (error) {
        console.error('Fatal error during startup:', error)
        process.exit(1)
    }
}

// Start the system
main().catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
})
