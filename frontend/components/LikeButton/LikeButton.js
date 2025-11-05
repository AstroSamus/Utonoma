import { ConfirmLikeOrDislike as ConfirmLikeOrDislikeFactory } from '../modals/ConfirmLikeOrDislike/ConfirmLikeOrDislike.js'
import { readOnlyProvider } from "../../web3_providers/readOnlyProvider.js"
import { formatUnits } from 'ethers'
import { appkit } from '../../web3_providers/signedProvider.js'

export const ACTIONS = {
  waiting: 'waiting',
  loading: 'loading',
  pressingButton: 'likeButtonPressed',
  checkingIfUserIsConnected: 'checkingIfUserIsConnected',
  requestingFeeAcceptance: 'requestingFeeAcceptance',
  checkingAccountBalance: 'checkingAccountBalance',
  waitingForApproveOnWallet: 'waitingForApproveOnWallet',
  waitingForBlockchainResult: 'waitingForBlockchainResult',
  updatingUtonomaIdentifier: 'updatingUtonomaIdentifier',
  success: 'success',
  userDisconnectedError: 'userDisconnectedError',
  balanceNotEnoughtError: 'balanceNotEnoughtError',
  genericError: 'genericError'
}

export class State {

  #loading = false
  #votesCount = '-'
  #currentAction = ACTIONS.waiting
  isDeleteable = false

  constructor(effects = {}, actions = {}) {
    this.utonomaIdentifier = {}
    this.effects = effects
    this.actions = actions
  }

  get loading() {
    return this.#loading
  }

  set loading(value) {
    this.#loading = value
    this.effects.loading?.()
  }

  get votesCount() {
    return this.#votesCount
  }

  set votesCount(value) {
    this.#votesCount = value
    this.effects.votesCount?.()
  }

  get currentAction() {
    return this.#currentAction
  }
  
  set currentAction({value, payload }) {
    if (!Object.values(ACTIONS).includes(value)) {
      throw new Error(`Invalid action: "${value}". Must be one of: ${Object.values(ACTIONS).join(', ')}`)
    }
    this.#currentAction = value
    this.actions[this.#currentAction]?.(payload)
  }
}

export const LikeButton = ($container) => { 

  const $buttonLikeShortVideo = $container
  const $likesNumber = $container.querySelector('#likesNumber')
  const $dialogNotEnoughBalanceError = document.querySelector('#dialogNotEnoughBalanceError')
  const $dialogCheckWalletToApprove = document.querySelector('#dialogCheckWalletToApprove')
  const $dialogLikeContentTransactionSent = document.querySelector('#dialogLikeContentTransactionSent')
  const $dialogLikeButtonSuccess = document.querySelector('#dialogLikeButtonSuccess')
  const $dialogLikeButtonError = document.querySelector('#dialogLikeButtonError')

  let ConfirmLikeOrDislike
  let modal
  let currentFee
  let likeResult

  const _effects = {
    loading: () => {
      if(state.loading) {
        $buttonLikeShortVideo.disabled = true
        $buttonLikeShortVideo.style.visibility = 'hidden'
      }
      else {
        $buttonLikeShortVideo.disabled = false
        $buttonLikeShortVideo.style.visibility = 'visible'
      }
    },
    votesCount: () => {
      $likesNumber.innerHTML = state.votesCount
    }
  }

  const actions = {
    checkingIfUserIsConnected: async () => {
      if(!modal) {
          const { appkit } = await import('../../web3_providers/signedProvider.js')
          const modalInstance = appkit.modal
          modal = modalInstance
      }
      if(modal.getIsConnectedState()) {
        state.isDeleteable
        ? state.currentAction = { value: ACTIONS.alertDelete }
        : state.currentAction = { value: ACTIONS.requestingFeeAcceptance }
      } 
      else state.currentAction = { value: ACTIONS.userDisconnectedError}
    },
    requestingFeeAcceptance: async () => {
      try {
        currentFee = await readOnlyProvider.genericRequests.getCurrentFee(modal.getAddress())
        if(!ConfirmLikeOrDislike) ConfirmLikeOrDislike = ConfirmLikeOrDislikeFactory(document.querySelector('#dialogConfirmLikeOrDislike'))
        ConfirmLikeOrDislike.updateFee(formatUnits(currentFee, 18))
        const confirmation = await ConfirmLikeOrDislike.askForUserConfirmation()
        if(!confirmation) state.loading = false //user rejected
        else state.currentAction = { value: ACTIONS.checkingAccountBalance }
      } catch (error) {
        state.currentAction = { value: ACTIONS.genericError }
      }
    },
    checkingAccountBalance: async () => {
      try {
        const accountBalance = await readOnlyProvider.genericRequests.getBalance(modal.getAddress())
        if(accountBalance <= currentFee) state.currentAction = { value: ACTIONS.balanceNotEnoughtError }
        else state.currentAction = { value: ACTIONS.waitingForApproveOnWallet }
      } catch(error) {
        state.currentAction = { value: ACTIONS.genericError }
      }
    },
    waitingForApproveOnWallet: async () => {
      try {
        $dialogCheckWalletToApprove.showModal()
        const utonomaContractForSignedTransactions = await appkit.utonomaContract
        likeResult = await utonomaContractForSignedTransactions.like([state.utonomaIdentifier.index, state.utonomaIdentifier.contentType])
        state.currentAction = { value: ACTIONS.waitingForBlockchainResult, payload: likeResult }
      } catch(error) {
        state.currentAction = { value: ACTIONS.genericError }
      } finally {
        $dialogCheckWalletToApprove.close()
      } 
    },
    waitingForBlockchainResult: async (likeResult) => {
      try {
        $dialogLikeContentTransactionSent.show()
        setTimeout(() => $dialogLikeContentTransactionSent.close(), 5000)
        await likeResult.wait()
        state.currentAction = { value: ACTIONS.success }
      } catch(error) {
        state.currentAction = { value: ACTIONS.genericError }
      } finally {
        state.loading = false
      }
    },
    success: () => {
      $likesNumber.innerHTML = parseInt($likesNumber.innerHTML) + 1
      $dialogLikeButtonSuccess.show()
      setTimeout(() => $dialogLikeButtonSuccess.close(), 5000)
    },
    userDisconnectedError: async () => {
      const { setIsLoggedIn, setAddress } = await import('../../services/userManager/userManager.js')
      setIsLoggedIn(false)
      setAddress('')
      location.hash = 'rightPanelContainer'
      setTimeout(() => location.hash = '', 100)
      state.loading = false
    },
    genericError: () => {
      state.loading = false 
      $dialogLikeButtonError.show()
      setTimeout(() => $dialogLikeButtonError.close(), 5000)
    },
    balanceNotEnoughtError: () => {
      $dialogNotEnoughBalanceError.show()
      setTimeout(() => $dialogNotEnoughBalanceError.close(), 5000)
      state.loading = false
    }
  }

  const state = new State(_effects, actions)

  $buttonLikeShortVideo.addEventListener('click', () => {
    state.currentAction = { value: ACTIONS.checkingIfUserIsConnected }
  })

  return state
}