"use client"

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { NEXT_PUBLIC_PDX_TOKEN_ADDRESS } from '@/lib/web3/config';
import { PlusCircle } from 'lucide-react';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export function AddTokenButton() {
    const { isConnected } = useAccount();
    const [isAdded, setIsAdded] = useState(false);

    const addToken = async () => {
        if (!window.ethereum) return;

        try {
            // WasAdded is a boolean. Like any RPC method, an error may be thrown.
            const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: NEXT_PUBLIC_PDX_TOKEN_ADDRESS,
                        symbol: 'PDX',
                        decimals: 18,
                        // image: 'https://your-app-url.com/pdx-logo.png', // Optional
                    },
                },
            });

            if (wasAdded) {
                setIsAdded(true);
                console.log('PDX token added!');
            } else {
                console.log('PDX token not added');
            }
        } catch (error) {
            console.log(error);
        }
    };

    if (!isConnected) return null;

    return (
        <button
            onClick={addToken}
            disabled={isAdded}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Add PDX Token to Wallet"
        >
            <PlusCircle size={14} />
            {isAdded ? 'PDX Added' : 'Add PDX'}
        </button>
    );
}
