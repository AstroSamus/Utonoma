import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { 
  networks,
  appkitProjectId as projectId,
  appkitMetadata as metadata
} from 'config.env'
import { BrowserProvider, Contract } from 'ethers'
import { utonomaSepoliaAddress, utonomaABI } from '../utonomaSmartContract.js'

/**
 * Lazy-initialized AppKit singleton with connection state and contract access.
 *
 * @namespace appkit
 * @property {import('@reown/appkit').AppKit} modal - Singleton AppKit instance returned by `createAppKit()`.
 * @property {boolean} isConnected - Whether a wallet is currently connected.
 * @property {Promise<import('ethers').Contract>} utonomaContract - Promise resolving to the Utonoma contract instance.
 */
export const appkit = {
  _modal: null,
  _isConnected: null,
  _utonomaContractPromise: null,

  get modal() {
    if (!this._modal) {
      console.log("Inicializando modal por primera vez...");
      this._modal = createAppKit({
        adapters: [new EthersAdapter()],
        networks,
        metadata,
        debug: true,
        projectId,
        features: {
          analytics: true,
        },
        tokens: {
          "eip155:534351": { address: utonomaSepoliaAddress },
        },
        allWallets: "SHOW",
      });

      this._modal.subscribeProviders((state) => {
        this._isConnected = !!state["eip155"];
        console.log("Estado de conexión actualizado:", this._isConnected);
        if (!this._isConnected) this._utonomaContract = null;
      });
    }
    return this._modal;
  },
  get isConnected() {
    if (this._isConnected === null) {
      const providers = this.modal.getProviders();
      return !!providers["eip155"];
    }
    return this._isConnected;
  },

  /**
   * Returns a Promise that resolves to the Utonoma contract instance.
   * If the user is not connected, the Promise rejects with an Error.
   *
   * @returns {Promise<import('ethers').Contract>} Contract instance connected to the user's signer.
   * @throws {Error} When the user is disconnected or the EIP-155 provider is not available.
   */
  get utonomaContract() {
    if (this._utonomaContractPromise) return this._utonomaContractPromise;

    this._utonomaContractPromise = (async () => {
      if (!this.isConnected) throw(new Error('User disconnected'));
      const providers = this.modal.getProviders();
      const eip155Provider = providers["eip155"];
      if (!eip155Provider) throw(new Error("EIP-155 provider is not available"));
      const ethProvider = new BrowserProvider(eip155Provider)
      const ethSigner = await ethProvider.getSigner()
      return new Contract(utonomaSepoliaAddress, utonomaABI, ethSigner)
    })();
    return this._utonomaContract;
  }
};



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
