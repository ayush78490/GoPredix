/**
 * Wallet adapter utilities
 * Converts wagmi wallet client to ethers signer
 */

export function walletClientToSigner(walletClient: any) {
    const { account, chain, transport } = walletClient;

    return {
        getAddress: async () => account.address,
        signMessage: async (message: string) => {
            return walletClient.signMessage({ message });
        },
        signTransaction: async (transaction: any) => {
            return walletClient.signTransaction(transaction);
        },
        sendTransaction: async (transaction: any) => {
            const hash = await walletClient.sendTransaction(transaction);
            return { hash };
        },
        provider: transport,
    };
}
