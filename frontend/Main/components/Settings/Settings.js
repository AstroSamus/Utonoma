import { 
  setIsLoggedIn,
  setAddress
} from '../../../services/userManager/userManager.js'

const $settings = document.querySelector('#settings')
const $dialogSendOrReceiveTokens = document.querySelector('#dialogSendOrReceiveTokens')
const $connectWallet = document.querySelector('#connectWallet')
const $buttonManageAccount = document.querySelector('#buttonManageAccount')
const $buttonSendTokens = document.querySelector('#buttonSendTokens')
const $buttonDialogCloseSendTokens = document.querySelector('#buttonDialogCloseSendTokens')
const $buttonBuySellTokens = document.querySelector('#buttonBuySellTokens')

$buttonManageAccount.addEventListener('click', async () => {
  $buttonManageAccount.disabled = true
  const { appkit } = await import('../../../web3_providers/signedProvider.js')
  const modal = appkit.modal
  modal.subscribeState(async(newState) => {
    const isLoggedIn = modal.getIsConnectedState()
    if(isLoggedIn) {
      setIsLoggedIn(true)
      setAddress(modal.getAddress())
    } else {
      setIsLoggedIn(false)
      setAddress('')
      $settings.style.display = 'none'
      $connectWallet.style.display = 'flex'
      await import('../ConnectWallet/ConnectWallet.js')
    }
  })
  modal.open()
  $buttonManageAccount.disabled = false
})


$buttonSendTokens.addEventListener('click', () => {
  $dialogSendOrReceiveTokens.showModal()
})

$buttonDialogAddTokenAutomatically.addEventListener('click' , async() => {
  const { 
    utonomaSepoliaAddress,
    sepoliaTokenSymbol,
    tokenDecimals
  } = await import('../../../utonomaSmartContract.js')
  const { appkit } = await import('../../../web3_providers/signedProvider.js')
  const walletProvider = await appkit.utonomaContract
  console.log(walletProvider)
  try {
    // wasAdded is a boolean. Like any RPC method, an error may be thrown.
    const wasAdded = await walletProvider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20', // Initially only supports ERC20, but eventually more!
        options: {
          address: utonomaSepoliaAddress, // The address that the token is at.
          symbol: sepoliaTokenSymbol, // A ticker symbol or shorthand, up to 5 chars.
          decimals: tokenDecimals, // The number of decimals in the token
          //image: , // A string url of the token logo
        },
      },
    })

    if (wasAdded) {
      console.log('Thanks for your interest!');
    } else {
      console.log('Your loss!');
    }
  } catch (error) {
    console.log(error);
  }

})

$buttonDialogCloseSendTokens.addEventListener('click', () => {
  $dialogSendOrReceiveTokens.close()
})

$buttonBuySellTokens.addEventListener('click', async () => {
  const { dexLink } = await import('../../../utonomaSmartContract.js')
  window.location.href = dexLink
})