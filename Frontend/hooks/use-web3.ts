"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import {
  PREDICTION_MARKET_ADDRESS,
  PREDICTION_MARKET_ABI,
  OUTCOME_TOKEN_ABI,
  CHAIN_CONFIG,
} from "@/lib/web3/config"

// Simple provider detection
const getEthereumProvider = () => {
  if (typeof window === "undefined") return null
  return window.ethereum || null
}

// ✅ CRITICAL: Create RPC provider fallback
const createRpcProvider = () => {
  try {
    const rpcProvider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl)
    return rpcProvider
  } catch (error) {
    console.error("❌ Failed to create RPC provider:", error)
    return null
  }
}

// Storage keys for persistence
const STORAGE_KEYS = {
  USER_DISCONNECTED: "user_disconnected",
  LAST_CONNECTED_ACCOUNT: "last_connected_account",
}

export function useWeb3() {
  // ✅ FIXED: Allow both BrowserProvider and JsonRpcProvider
  const [provider, setProvider] = useState<
    ethers.BrowserProvider | ethers.JsonRpcProvider | null
  >(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check if user has manually disconnected
  const hasUserDisconnected = useCallback(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(STORAGE_KEYS.USER_DISCONNECTED) === "true"
  }, [])

  // Set user disconnected flag
  const setUserDisconnected = useCallback((disconnected: boolean) => {
    if (typeof window === "undefined") return
    if (disconnected) {
      localStorage.setItem(STORAGE_KEYS.USER_DISCONNECTED, "true")
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_DISCONNECTED)
    }
  }, [])

  // Store last connected account
  const setLastConnectedAccount = useCallback((account: string | null) => {
    if (typeof window === "undefined") return
    if (account) {
      localStorage.setItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT, account)
    } else {
      localStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT)
    }
  }, [])

  // Get last connected account
  const getLastConnectedAccount = useCallback(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEYS.LAST_CONNECTED_ACCOUNT)
  }, [])

  // ✅ CRITICAL FIX: Initialize RPC provider FIRST - runs on mount
  useEffect(() => {
    try {
      const rpcProvider = createRpcProvider()
      if (rpcProvider) {
        setProvider(rpcProvider)
        setChainId(CHAIN_CONFIG.chainId)
        setIsInitialized(true) // Set initialized immediately with RPC provider
      } else {
        console.error("❌ Failed to create RPC provider")
        setIsInitialized(true) // Still set to true even if RPC fails
      }
    } catch (error) {
      console.error("❌ Error in RPC initialization:", error)
      setIsInitialized(true) // Still set to true even on error
    }
  }, []) // Empty dependency array - runs ONLY once on mount

  const connectWallet = useCallback(async () => {
    const ethereumProvider = getEthereumProvider()
    if (!ethereumProvider) {
      setError("Please install MetaMask")
      return
    }

    try {
      setIsConnecting(true)
      setError(null)
      setUserDisconnected(false)


      let accounts: string[] = []

      accounts = (await ethereumProvider.request({
        method: "eth_requestAccounts",
      })) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const web3Provider = new ethers.BrowserProvider(ethereumProvider)
      const web3Signer = await web3Provider.getSigner()
      const address = await web3Signer.getAddress()
      const network = await web3Provider.getNetwork()


      setProvider(web3Provider)
      setSigner(web3Signer)
      setAccount(address)
      setChainId(Number(network.chainId))
      setLastConnectedAccount(address)

      // Check if we're on the correct network
      if (Number(network.chainId) !== CHAIN_CONFIG.chainId) {
        await switchNetwork()
      }
    } catch (err: any) {
      console.error("❌ Error connecting wallet:", err)

      if (err.code === 4001) {
        setError("Connection rejected by user")
      } else if (err.code === -32002) {
        setError("Connection already pending. Please check MetaMask.")
      } else {
        setError(err.message || "Failed to connect wallet")
      }
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const switchNetwork = async () => {
    const ethereumProvider = getEthereumProvider()
    if (!ethereumProvider) return

    try {
      await ethereumProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_CONFIG.chainId.toString(16)}` }],
      })
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereumProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${CHAIN_CONFIG.chainId.toString(16)}`,
                chainName: CHAIN_CONFIG.chainName,
                rpcUrls: [CHAIN_CONFIG.rpcUrl],
                blockExplorerUrls: [CHAIN_CONFIG.blockExplorer],
                nativeCurrency: CHAIN_CONFIG.nativeCurrency,
              },
            ],
          })
        } catch (addError) {
          console.error("❌ Error adding network:", addError)
        }
      }
    }
  }

  const disconnectWallet = useCallback(() => {
    setSigner(null)
    setAccount(null)
    setError(null)
    setUserDisconnected(true)
    setLastConnectedAccount(null)

    // ✅ Keep RPC provider for read-only operations
    const rpcProvider = createRpcProvider()
    if (rpcProvider) {
      setProvider(rpcProvider)
      setChainId(CHAIN_CONFIG.chainId)
    }
  }, [])

  // Initialize wallet connection on component mount
  useEffect(() => {
    const initializeWallet = async () => {
      if (hasUserDisconnected()) {
        return
      }

      const ethereumProvider = getEthereumProvider()
      if (!ethereumProvider) {
        return
      }

      try {
        const accounts = (await ethereumProvider.request({
          method: "eth_accounts",
        })) as string[]

        if (accounts && accounts.length > 0) {
          const web3Provider = new ethers.BrowserProvider(ethereumProvider)
          const web3Signer = await web3Provider.getSigner()
          const address = await web3Signer.getAddress()
          const network = await web3Provider.getNetwork()


          setProvider(web3Provider)
          setSigner(web3Signer)
          setAccount(address)
          setChainId(Number(network.chainId))
          setLastConnectedAccount(address)
        } else {
        }
      } catch (error) {
        console.error("❌ Error initializing wallet:", error)
      }
    }

    initializeWallet()
  }, [hasUserDisconnected, setLastConnectedAccount])

  // Use polling instead of event listeners to avoid the addListener issue
  useEffect(() => {
    const ethereumProvider = getEthereumProvider()
    if (!ethereumProvider || !account || !isInitialized) return

    let mounted = true
    let lastAccounts: string[] = [account!]
    let lastChainId: string = chainId ? `0x${chainId.toString(16)}` : ""

    const pollForChanges = async () => {
      if (!mounted) return

      try {
        const accounts = (await ethereumProvider.request({
          method: "eth_accounts",
        })) as string[]

        if (JSON.stringify(accounts) !== JSON.stringify(lastAccounts)) {
          lastAccounts = accounts
          if (accounts.length === 0) {
            setSigner(null)
            setAccount(null)
            // Keep RPC provider
            const rpcProvider = createRpcProvider()
            if (rpcProvider) {
              setProvider(rpcProvider)
            }
          } else if (accounts[0] !== account) {
            setAccount(accounts[0])
            setLastConnectedAccount(accounts[0])
            const web3Provider = new ethers.BrowserProvider(ethereumProvider)
            const web3Signer = await web3Provider.getSigner()
            setSigner(web3Signer)
            setProvider(web3Provider)
          }
        }

        const currentChainId = (await ethereumProvider.request({
          method: "eth_chainId",
        })) as string

        if (currentChainId !== lastChainId) {
          lastChainId = currentChainId
          const newChainId = parseInt(currentChainId, 16)
          setChainId(newChainId)

          const web3Provider = new ethers.BrowserProvider(ethereumProvider)
          setProvider(web3Provider)
          const web3Signer = await web3Provider.getSigner()
          setSigner(web3Signer)
        }
      } catch (error) {
      }

      if (mounted) {
        setTimeout(pollForChanges, 2000)
      }
    }

    pollForChanges()

    return () => {
      mounted = false
    }
  }, [account, chainId, isInitialized, setLastConnectedAccount])

  return {
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    isCorrectNetwork: chainId === CHAIN_CONFIG.chainId,
    switchNetwork,
    isInitialized,
  }
}

// Hook for interacting with the prediction market contract
export function usePredictionMarket(
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null,
  signer: ethers.Signer | null,
  account: string | null
) {
  const [isContractReady, setIsContractReady] = useState(false)

  // Check if contract is ready
  useEffect(() => {
    const checkContract = async () => {

      if (!provider) {
        setIsContractReady(false)
        return
      }

      try {
        const contract = new ethers.Contract(
          PREDICTION_MARKET_ADDRESS,
          PREDICTION_MARKET_ABI,
          provider
        )

        // Test contract by calling a view function
        const nextId = await contract.nextMarketId()
        setIsContractReady(true)
      } catch (error) {
        console.error("❌ Contract verification failed:", error)
        setIsContractReady(false)
      }
    }

    checkContract()
  }, [provider, account])

  const getContract = useCallback(
    (withSigner = true) => {
      if (!provider) {
        return null
      }
      // For write operations, ensure signer exists
      if (withSigner && !signer) {
        return null
      }
      const signerOrProvider = withSigner && signer ? signer : provider
      return new ethers.Contract(
        PREDICTION_MARKET_ADDRESS,
        PREDICTION_MARKET_ABI,
        signerOrProvider
      )
    },
    [provider, signer]
  )

  const getTokenContract = useCallback(
    (tokenAddress: string, withSigner = true) => {
      if (!provider) return null
      const signerOrProvider = withSigner && signer ? signer : provider
      return new ethers.Contract(
        tokenAddress,
        OUTCOME_TOKEN_ABI,
        signerOrProvider
      )
    },
    [provider, signer]
  )

  // Create a new market
  const createMarket = async (
    question: string,
    endTime: number,
    initialYes: string,
    initialNo: string
  ) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")


    const yesAmount = ethers.parseEther(initialYes)
    const noAmount = ethers.parseEther(initialNo)
    const totalValue = yesAmount + noAmount

    const tx = await contract.createMarket(
      question,
      endTime,
      yesAmount,
      noAmount,
      {
        value: totalValue,
      }
    )

    const receipt = await tx.wait()

    // Parse the MarketCreated event to get the market ID
    const event = receipt.logs.find((log: any) => {
      try {
        return contract.interface.parseLog(log)?.name === "MarketCreated"
      } catch {
        return false
      }
    })

    if (event) {
      const parsed = contract.interface.parseLog(event)
      const marketId = Number(parsed?.args[0])
      return marketId
    }

    throw new Error("Market creation event not found")
  }

  // Mint complete sets
  const mintCompleteSets = async (marketId: number, amount: string) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const value = ethers.parseEther(amount)
    const tx = await contract.mintCompleteSets(marketId, value, { value })
    return await tx.wait()
  }

  // Burn complete sets
  const burnCompleteSets = async (marketId: number, amount: string) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const value = ethers.parseEther(amount)
    const tx = await contract.burnCompleteSets(marketId, value)
    return await tx.wait()
  }

  // Buy YES tokens
  const buyYes = async (marketId: number, amount: string, slippage = 1) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const amountIn = ethers.parseEther(amount)

    // Get expected output with slippage
    const [amountOut] = await contract.getAmountOut(marketId, amountIn, false)
    const minOut = (amountOut * BigInt(100 - slippage)) / BigInt(100)

    // First mint complete sets
    const mintTx = await contract.mintCompleteSets(marketId, amountIn, {
      value: amountIn,
    })
    await mintTx.wait()

    // Then swap NO for YES
    const swapTx = await contract.swapNoForYes(marketId, amountIn, minOut)
    return await swapTx.wait()
  }

  // Buy NO tokens
  const buyNo = async (marketId: number, amount: string, slippage = 1) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const amountIn = ethers.parseEther(amount)

    // Get expected output with slippage
    const [amountOut] = await contract.getAmountOut(marketId, amountIn, true)
    const minOut = (amountOut * BigInt(100 - slippage)) / BigInt(100)

    // First mint complete sets
    const mintTx = await contract.mintCompleteSets(marketId, amountIn, {
      value: amountIn,
    })
    await mintTx.wait()

    // Then swap YES for NO
    const swapTx = await contract.swapYesForNo(marketId, amountIn, minOut)
    return await swapTx.wait()
  }

  // Sell YES tokens
  const sellYes = async (marketId: number, amount: string, slippage = 1) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const amountIn = ethers.parseEther(amount)
    const [amountOut] = await contract.getAmountOut(marketId, amountIn, true)
    const minOut = (amountOut * BigInt(100 - slippage)) / BigInt(100)

    const tx = await contract.swapYesForNo(marketId, amountIn, minOut)
    return await tx.wait()
  }

  // Sell NO tokens
  const sellNo = async (marketId: number, amount: string, slippage = 1) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const amountIn = ethers.parseEther(amount)
    const [amountOut] = await contract.getAmountOut(marketId, amountIn, false)
    const minOut = (amountOut * BigInt(100 - slippage)) / BigInt(100)

    const tx = await contract.swapNoForYes(marketId, amountIn, minOut)
    return await tx.wait()
  }

  // Get market data
  const getMarket = async (marketId: number) => {
    const contract = getContract(false)
    if (!contract) throw new Error("Contract not initialized")

    const market = await contract.getMarket(marketId)
    const [yesPrice, noPrice] = await contract.getPrice(marketId)

    return {
      id: marketId,
      creator: market[0],
      question: market[1],
      endTime: Number(market[2]),
      status: Number(market[3]),
      outcome: Number(market[4]),
      yesToken: market[5],
      noToken: market[6],
      yesPool: market[7],
      noPool: market[8],
      lpTotalSupply: market[9],
      totalBacking: market[10],
      yesPrice: Number(yesPrice) / 100,
      noPrice: Number(noPrice) / 100,
    }
  }

  // Get all markets
  const getAllMarkets = async () => {
    const contract = getContract(false)
    if (!contract) {
      console.error("❌ Contract not available")
      throw new Error("Contract not initialized")
    }

    try {
      const nextId = await contract.nextMarketId()
      const marketCount = Number(nextId)

      if (marketCount === 0) {
        return []
      }

      const markets = []
      for (let i = 0; i < marketCount; i++) {
        try {
          const market = await getMarket(i)
          markets.push(market)
        } catch (error) {
        }
      }

      return markets
    } catch (error) {
      console.error("❌ Error fetching markets:", error)
      throw error
    }
  }

  // Get token balances
  const getTokenBalances = async (marketId: number) => {
    if (!account) return { yes: "0", no: "0" }

    const contract = getContract(false)
    if (!contract) throw new Error("Contract not initialized")

    const market = await contract.getMarket(marketId)
    const yesTokenContract = getTokenContract(market[5], false)
    const noTokenContract = getTokenContract(market[6], false)

    if (!yesTokenContract || !noTokenContract) {
      return { yes: "0", no: "0" }
    }

    const [yesBalance, noBalance] = await Promise.all([
      yesTokenContract.balanceOf(account),
      noTokenContract.balanceOf(account),
    ])

    return {
      yes: ethers.formatEther(yesBalance),
      no: ethers.formatEther(noBalance),
    }
  }

  // Redeem winning tokens
  const redeem = async (marketId: number) => {
    if (!signer) throw new Error("Wallet not connected")

    const contract = getContract(true)
    if (!contract) throw new Error("Contract not initialized")

    const tx = await contract.redeem(marketId)
    return await tx.wait()
  }

  return {
    createMarket,
    mintCompleteSets,
    burnCompleteSets,
    buyYes,
    buyNo,
    sellYes,
    sellNo,
    getMarket,
    getAllMarkets,
    getTokenBalances,
    redeem,
    contract: getContract(false),
    isContractReady,
  }
}