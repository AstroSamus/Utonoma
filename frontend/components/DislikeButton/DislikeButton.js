import {ACTIONS, LikeButton } from '../LikeButton/LikeButton.js'
import { appkit } from '../../web3_providers/signedProvider.js'
import { GenericModal as GenericModalFactory } from '../modals/GenericModal/GenericModal.js'

export const DislikeButton = ($container) => {
  
  const $dialogCheckWalletToApprove = document.querySelector('#dialogCheckWalletToApprove')
  const $dialogLikeButtonSuccess = document.querySelector('#dialogLikeButtonSuccess')

  const DislikeButton = LikeButton($container)
  const DialogConfirmDelete = GenericModalFactory(document.querySelector('#dialogConfirmDelete'))
  

  ACTIONS.alertDelete = 'alertDelete',
  ACTIONS.waitingForDeletionApproveOnWallet = 'waitingForDeletionApproveOnWallet'

  DislikeButton.actions.alertDelete = async() => {
    try {
      await DialogConfirmDelete.actions.showDialog()
      ? DislikeButton.currentAction = { value: ACTIONS.waitingForDeletionApproveOnWallet }
      : DislikeButton.currentAction = { value: ACTIONS.waiting }
    } catch (error) {
      state.currentAction = { value: ACTIONS.genericError }
    }
  }
  DislikeButton.actions.waitingForApproveOnWallet = async() => {
    try {
      $dialogCheckWalletToApprove.showModal()
      const utonomaContractForSignedTransactions = await appkit.utonomaContract
      let likeResult = await utonomaContractForSignedTransactions.dislike([DislikeButton.utonomaIdentifier.index, DislikeButton.utonomaIdentifier.contentType])
      DislikeButton.currentAction = { 
        value: ACTIONS.waitingForBlockchainResult, 
        payload: likeResult
      } 
    } catch(error) {
      console.log('Error while disliking content:', error)
    } finally {
      $dialogCheckWalletToApprove.close()
    }
  } 
  DislikeButton.actions.waitingForDeletionApproveOnWallet = async() => {
    try {
      const { utonomaContractForSignedTransactions } = await appkit.utonomaContract()
      const transaction = await utonomaContractForSignedTransactions.deletion(DislikeButton.utonomaIdentifier)
      const deleteResult = await transaction.wait()
      if(deleteResult.status === 1) {
        $dialogLikeButtonSuccess.show()
        setTimeout(() => $dialogLikeButtonSuccess.close(), 5000)
      } else {
        DislikeButton.currentAction = { value: ACTIONS.genericError }
      }
    } catch (error) {
      console.error('Error while deleting content:', error)
      DislikeButton.currentAction = { value: ACTIONS.genericError }
    }
  }
  return DislikeButton
}