# Auto Dispute Finalization System

## Overview

The Auto Dispute Finalization System automatically finalizes disputes when their voting periods end. This ensures that:

1. **Disputes are resolved automatically** - No manual intervention needed
2. **Traders are notified** - `DisputeResolved` event is emitted
3. **Stakes can be claimed** - Winners can claim their rewards immediately

## How It Works

### 1. Dispute Lifecycle

```
Market Resolved → User Creates Dispute → Validators Vote → Voting Ends → Auto-Finalization → Stakes Claimed
```

### 2. Auto-Finalization Monitor

The `auto-dispute-finalization-monitor.ts` script:

- **Monitors** all active disputes (BNB + PDX)
- **Detects** when voting periods end
- **Calls** `finalizeDispute()` automatically
- **Emits** `DisputeResolved` event with outcome

### 3. Trader Notifications

When a dispute is finalized, the `DisputeResolved` event contains:

- `disputeId` - The dispute ID
- `outcome` - ACCEPTED (1) or REJECTED (2)
- `totalStakeAccept` - Total stake voting to accept
- `totalStakeReject` - Total stake voting to reject

Frontend applications can listen for this event to:
- Notify traders who participated in the market
- Update UI to show dispute outcome
- Allow winners to claim their stakes

## Running the Monitor

### Start the Service

```bash
cd Backend
npx ts-node scripts/auto-dispute-finalization-monitor.ts
```

### Environment Variables Required

```env
RPC_URL=https://bsc-testnet-rpc.publicnode.com
RESOLVER_PRIVATE_KEY=your_private_key_here
```

### Output Example

```
═══════════════════════════════════════════════
⚖️  Auto Dispute Finalization Monitor
═══════════════════════════════════════════════
Network: https://bsc-testnet-rpc.publicnode.com
Finalizer: 0xd84fdA5439152A51fBc11C2a5838F3aFF57ce02e
Check Interval: 60s
═══════════════════════════════════════════════

💰 Finalizer Balance: 0.217 BNB

🔎 Scanning disputes at 2025-12-24T13:15:00.000Z
   BNB Disputes: 0-2
   PDX Disputes: 0-1

🔍 Found dispute ready for finalization:
   Type: PDX
   Dispute ID: 0
   Market: 0x151fE04C421E197B982A4F62a65Acd6F416af51a
   Market ID: 0
   Voting Ended: 2025-12-24T13:10:00.000Z

⏳ Finalizing dispute...
   Transaction: 0xabc123...
✅ Dispute finalized successfully!
   Block: 80375200
   Outcome: ACCEPTED
   Accept Stake: 15.5
   Reject Stake: 8.2

✨ Finalized 1 dispute(s)
```

## Integration with Frontend

### Listen for DisputeResolved Events

```typescript
import { usePublicClient } from 'wagmi'
import DISPUTE_ABI from '../contracts/DisputeResolution.json'

const publicClient = usePublicClient()
const disputeContract = new ethers.Contract(
    DISPUTE_ADDRESS,
    DISPUTE_ABI,
    publicClient
)

// Listen for dispute resolutions
disputeContract.on('DisputeResolved', (disputeId, outcome, acceptStake, rejectStake) => {
    console.log(`Dispute ${disputeId} resolved:`, outcome === 1 ? 'ACCEPTED' : 'REJECTED')
    
    // Notify traders
    notifyTradersAboutResolution(disputeId, outcome)
    
    // Update UI
    refreshDisputesList()
})
```

### Notify Traders

You can implement trader notifications by:

1. **Fetching market participants** from trade events
2. **Checking if they're affected** by the dispute outcome
3. **Sending notifications** via:
   - In-app notifications
   - Email (if you have user emails)
   - Push notifications (if using PWA)
   - Discord/Telegram webhooks

## Deployment

### Production Deployment

For production, you should:

1. **Run as a systemd service** (Linux)
2. **Use PM2** for process management
3. **Set up monitoring** and alerts
4. **Use a dedicated wallet** with sufficient BNB for gas

### Example PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'dispute-finalizer',
    script: 'npx',
    args: 'ts-node scripts/auto-dispute-finalization-monitor.ts',
    cwd: './Backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

## Security Considerations

1. **Private Key Security** - Store in secure environment variables
2. **Gas Limits** - Monitor wallet balance to ensure continuous operation
3. **Rate Limiting** - Check interval is set to 60s to avoid excessive RPC calls
4. **Error Handling** - Script continues running even if individual finalizations fail

## Troubleshooting

### Monitor Not Finalizing Disputes

1. Check wallet has sufficient BNB for gas
2. Verify dispute voting period has actually ended
3. Check RPC connection is stable
4. Review logs for error messages

### Disputes Stuck in Active Status

- Ensure monitor is running
- Check if voting period has ended (`votingEndTime`)
- Manually call `finalizeDispute()` if needed

## Related Scripts

- `auto-resolution-monitor.ts` - Automatically requests AI resolution for ended markets
- `auto-dispute-finalization-monitor.ts` - Automatically finalizes disputes after voting ends

Together, these scripts provide a fully automated market resolution and dispute system.
