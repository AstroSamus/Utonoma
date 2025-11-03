import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { 
  networks,
  appkitProjectId as projectId,
  appkitMetadata as metadata
} from 'config.env'
import { BrowserProvider, Contract } from 'ethers'
import { utonomaSepoliaAddress, utonomaABI } from '../utonomaSmartContract.js'

let modal


export async function useSignedProvider() {
  return new Promise((resolve) => {
    //Give one second before returning the modal, as there are wrong lectures on the getIsConnected method when
    //we return it immediately
    if(!modal) {
      modal = createAppKit({
        adapters: [new EthersAdapter()],
        networks,
        metadata,
        debug: true,
        projectId,
        features: {
          analytics: true, // Optional - defaults to your Cloud configuration
        },
        tokens: {
          "eip155:534351": {
            address: utonomaSepoliaAddress,
          },
        },
        allWallets: 'SHOW'
      })
    }
    setTimeout(() => {
      resolve({ modal })
    }, 1000)
  }) 
}

export async function useUtonomaContractForSignedTransactions() {
  let { modal } = await useSignedProvider()
  if(!modal.getIsConnectedState()) throw(new Error('User disconnected'))
  const walletProvider = modal.getWalletProvider()
  const ethersProvider = new BrowserProvider(walletProvider)
  const signer = await ethersProvider.getSigner()
  const utonomaContractForSignedTransactions = new Contract(utonomaSepoliaAddress, utonomaABI, signer)
  return { 
    walletProvider,
    utonomaContractForSignedTransactions 
  }
}
