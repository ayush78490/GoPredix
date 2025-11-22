"use client"

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWeb3Context } from '@/lib/wallet-context';
import { useAccount } from 'wagmi';

interface CustomConnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function CustomConnectButton({ 
  className = "", 
  variant = "default",
  size = "md"
}: CustomConnectButtonProps) {
  const { isMobile, connectWallet, account, isCorrectNetwork } = useWeb3Context();

  // Size classes
  const sizeClasses = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-7 py-2 text-sm", 
    lg: "px-8 py-3 text-base"
  };

  // Variant classes
  const variantClasses = {
    default: "text-black bg-[#ECFEFF]/70 hover:bg-[#ECFEFF] shadow-lg hover:shadow-cyan-500/25",
    outline: "text-white bg-transparent border border-cyan-400/50 hover:bg-cyan-400/10",
    ghost: "text-white bg-transparent hover:bg-white/10"
  };

  const baseClasses = "rounded-full font-semibold transition-all duration-200";

  // For mobile, use the existing custom flow
  if (isMobile) {
    return (
      <button
        onClick={connectWallet}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      >
        {account ? "Connected" : "Login"}
      </button>
    );
  }

  // For desktop, use RainbowKit's ConnectButton
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
                  >
                    Login
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className={`${baseClasses} ${sizeClasses[size]} bg-red-500 hover:bg-red-600 text-white ${className}`}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openChainModal}
                    className={`${baseClasses} ${sizeClasses[size]} text-white bg-[#271f40] border border-cyan-400/50 hover:bg-[#322a50] flex items-center gap-2 ${className}`}
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    className={`${baseClasses} ${sizeClasses[size]} text-white bg-[#271f40] border border-cyan-400/50 hover:bg-[#322a50] ${className}`}
                  >
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// Export a hook to check connection status that can be used by other components
export function useConnectStatus() {
  const { account: contextAccount, isCorrectNetwork } = useWeb3Context();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  
  // Unified connection state - consider connected if either system reports connection
  const isConnected = wagmiConnected || !!contextAccount;
  const account = wagmiAddress || contextAccount;
  
  return {
    isConnected,
    isCorrectNetwork,
    account,
    canTransact: isConnected && isCorrectNetwork
  };
}