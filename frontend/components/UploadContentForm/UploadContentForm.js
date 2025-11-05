import { ShortVideoMetadata } from '../../services/models.js'
import { convertIPFSHashToBytes32 } from '../../utils/encodingUtils/encodingUtils.js'
import { appkit } from '../../web3_providers/signedProvider.js'
import { validateVideoDuration } from '../../utils/validationUtils/validationUtils.js'
import { pinJsonToIpfs, pinFileToIPFS } from '../../services/ipfsService/ipfsService.js'
import { createStateForUploadContentForm } from './UploadContentForm.state.js'

export const UploadContentForm = ($container) => {

  const state = createStateForUploadContentForm()

  const $formUploadContent = $container.forms['formUploadContent'];
  const [$inputShortVideo, $textAreaShortVideoTitle, $textAreaVideoDescription] = $formUploadContent.elements
  const $videoPreview = $container.querySelector('#videoPreview')
  const $dialogWrongVideoFileError = $container.querySelector('#dialogWrongVideoFileError')
  const $dialogVideoTooLongError = $container.querySelector('#dialogVideoTooLongError')
  const $dialogUploadingDataToIpfsError = $container.querySelector('#dialogUploadingDataToIpfsError')
  const $dialogCheckWalletToApprove = document.querySelector('#dialogCheckWalletToApprove')
  const $dialogUploadContentTransactionSent = $container.querySelector('#dialogUploadContentTransactionSent')
  const $dialogUploadContentError = $container.querySelector('#dialogUploadContentError')
  const $buttonUploadContent = $container.querySelector('#buttonUploadContent')
  const $dialogSuccess = $container.querySelector('#dialogSuccess')

  //auxiliary variables for the effects
  let metadataHash
  let shortVideoHash
  let shortVideoFile
  let uploadResponse

  async function effects() {
    switch (state.currentState()) {
      case state.availiableStates.fillingForm:
        $buttonUploadContent.disabled = false
        $inputShortVideo.value = null //clear the required input so the user is forced to put a video again
        break
      case state.availiableStates.validatingForm:
        $buttonUploadContent.disabled = true
        shortVideoFile = $inputShortVideo.files[0]
        try{
          const shortVideoDuration = await validateVideoDuration($videoPreview, shortVideoFile, 60)
          if(!shortVideoDuration) state.setState(state.availiableStates.videoTooLongError, effects)
          else state.setState(state.availiableStates.checkingIfUserIsConnected, effects)
        } catch(error) {
          console.log(error)
          state.setState(state.availiableStates.wrongVideoFileError, effects)
        }
        break
      case state.availiableStates.checkingIfUserIsConnected:
        const modal = appkit.modal
        if(!modal.getIsConnectedState()) state.setState(state.availiableStates.userDisconnectedError, effects)
        else state.setState(state.availiableStates.uploadingToIpfs, effects)
        break
      case state.availiableStates.uploadingToIpfs:
        const metadata = new ShortVideoMetadata()
        metadata.shortVideoTitle = $textAreaShortVideoTitle.value,
        metadata.shortVideoDescription = $textAreaVideoDescription.value
        try {
          metadataHash = await pinJsonToIpfs(metadata)
          shortVideoHash = await pinFileToIPFS(shortVideoFile)
          state.setState(state.availiableStates.uploadingToUtonoma, effects)
        } catch (error) {
          console.log(error)
          state.setState(state.availiableStates.uploadingToIpfsError, effects)
        }
        break
      case state.availiableStates.uploadingToUtonoma:
        try {
          $dialogCheckWalletToApprove.showModal()
          const utonomaContractForSignedTransactions = await appkit.utonomaContract
          uploadResponse = await utonomaContractForSignedTransactions.upload(
            convertIPFSHashToBytes32(shortVideoHash.IpfsHash), 
            convertIPFSHashToBytes32(metadataHash.IpfsHash), 
            5
          )
          $dialogCheckWalletToApprove.close()
          state.setState(state.availiableStates.confirmingTransaction, effects)
        } catch (error) {
          console.log(error)
          $dialogCheckWalletToApprove.close()
          state.setState(state.availiableStates.genericError, effects)
        }
        break
      case state.availiableStates.confirmingTransaction:
        $dialogUploadContentTransactionSent.showModal()
        try {
          await uploadResponse.wait()
          $dialogUploadContentTransactionSent.close()
          state.setState(state.availiableStates.success, effects)
        } catch (error) {
          console.log(error)
          state.setState(state.availiableStates.genericError, effects)
        }
        break
      case state.availiableStates.success: 
        $dialogSuccess.showModal()
        setTimeout(() => { 
          $dialogSuccess.close()
          window.location.replace('/')
        }, 5000)
        break
      case state.availiableStates.videoTooLongError:
        $dialogVideoTooLongError.show()
        setTimeout(() => $dialogVideoTooLongError.close(), 5000)
        state.setState(state.availiableStates.fillingForm, effects)
        break
      case state.availiableStates.wrongVideoFileError:
        $dialogWrongVideoFileError.show()
        setTimeout(() => $dialogWrongVideoFileError.close(), 5000)
        state.setState(state.availiableStates.fillingForm, effects)
        break
      case state.availiableStates.uploadingToIpfsError:
        $dialogUploadingDataToIpfsError.show()
        setTimeout(() => $dialogUploadingDataToIpfsError.close(), 5000)
        state.setState(state.availiableStates.fillingForm, effects)
        break
      case state.availiableStates.genericError:
        $dialogUploadContentError.show()
        setTimeout(() => { $dialogUploadContentError.close() }, 8000)
        state.setState(state.availiableStates.fillingForm, effects)
        break
      case state.availiableStates.userDisconnectedError:
        console.log('user disconnected step')
        const { setIsLoggedIn, setAddress } = await import('../../services/userManager/userManager.js')
        setIsLoggedIn(false)
        setAddress('')
        window.location.replace('/#rightPanelContainer')
        setTimeout(() => location.hash = '', 100)
        state.setState(state.availiableStates.fillingForm, effects)
        break
    }
  }

  $formUploadContent.addEventListener('submit', async(event) => {
    event.preventDefault()
    state.setState(state.availiableStates.validatingForm, effects)
  })
}