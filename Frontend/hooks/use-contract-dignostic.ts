import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { ethers } from 'ethers'

interface ContractDiagnostic {
    contractAddress: string | null
    contractCode: boolean
    functionExists: boolean
    functionSignature: string | null
    functionSelector: string | null
    abiAvailable: boolean
    errors: string[]
}

export function useContractDiagnostic(contractAddress: string | undefined, functionName: string, abi: any[]) {
    const [diagnostic, setDiagnostic] = useState<ContractDiagnostic>({
        contractAddress: contractAddress || null,
        contractCode: false,
        functionExists: false,
        functionSignature: null,
        functionSelector: null,
        abiAvailable: false,
        errors: []
    })

    const publicClient = usePublicClient()

    useEffect(() => {
        if (!contractAddress || !publicClient) return

        const runDiagnostics = async () => {
            const errors: string[] = []
            let contractCode = false
            let functionExists = false
            let functionSignature: string | null = null
            let functionSelector: string | null = null
            let abiAvailable = false

            try {
                if (!ethers.isAddress(contractAddress)) {
                    errors.push(`Invalid contract address format: ${contractAddress}`)
                    setDiagnostic(prev => ({ ...prev, errors }))
                    return
                }

                try {
                    const code = await publicClient.getCode({ address: contractAddress as `0x${string}` })
                    contractCode = code !== '0x'
                    if (!contractCode) {
                        errors.push(`No contract code found at ${contractAddress} - may not be deployed`)
                    }
                } catch (err: any) {
                    errors.push(`Failed to check contract code: ${err.message}`)
                }

                if (abi && Array.isArray(abi)) {
                    abiAvailable = true
                    const func = abi.find(item => item.name === functionName && item.type === 'function')

                    if (func) {
                        functionExists = true
                        try {
                            const iface = new ethers.Interface(abi)
                            const fragment = iface.getFunction(functionName)
                            if (fragment) {
                                // Use format('minimal') or format('full') for signature
                                functionSignature = fragment.format('minimal')
                                functionSelector = fragment.selector
                            }
                        } catch (err: any) {
                            errors.push(`Failed to generate function signature: ${err.message}`)
                        }
                    } else {
                        errors.push(`Function "${functionName}" not found in ABI`)
                    }
                } else {
                    errors.push('ABI is not available or not an array')
                }

                setDiagnostic({
                    contractAddress,
                    contractCode,
                    functionExists,
                    functionSignature,
                    functionSelector,
                    abiAvailable,
                    errors
                })
            } catch (err: any) {
                errors.push(`Unexpected error during diagnostics: ${err.message}`)
                setDiagnostic(prev => ({ ...prev, errors }))
            }
        }

        runDiagnostics()
    }, [contractAddress, functionName, abi, publicClient])

    return diagnostic
}

export function logContractDiagnostics(diagnostic: ContractDiagnostic) {
    console.group('📋 CONTRACT DIAGNOSTIC REPORT')
    console.log('Contract Address:', diagnostic.contractAddress)
    console.log('Contract Deployed:', diagnostic.contractCode ? '✅ Yes' : '❌ No')
    console.log('Function in ABI:', diagnostic.functionExists ? '✅ Yes' : '❌ No')
    console.log('Function Signature:', diagnostic.functionSignature || 'N/A')
    console.log('Function Selector:', diagnostic.functionSelector || 'N/A')
    console.log('ABI Available:', diagnostic.abiAvailable ? '✅ Yes' : '❌ No')

    if (diagnostic.errors.length > 0) {
        console.group('🚨 Errors')
        diagnostic.errors.forEach(err => console.error('•', err))
        console.groupEnd()
    }
    console.groupEnd()
}
