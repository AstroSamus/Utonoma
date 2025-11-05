export const ContentInformationCard = (
  $template, 
  {
    identifierIndex,
    identifierContentType,
    shortVideoTitle,
    likes,
    dislikes,
    isHarvestable
  }
) => {
  $template.querySelector('#contentInfoCardTitle').innerText = shortVideoTitle
  $template.querySelector('#contentInfoCardLikes').innerText = likes
  $template.querySelector('#contentInfoCardDislikes').innerText = dislikes
  $template.querySelector('.Card__container').setAttribute('data-utonomaId', [identifierIndex, identifierContentType])
  if(isHarvestable) {
    $template.querySelector('.Card__container').classList.add('Card__container--glow')
    $template.querySelector('.Card__actionButton').addEventListener('click', async(e) => {
      const $container = e.target.closest('.Card__container')
      try {
        const { appkit } = await import('../../web3_providers/signedProvider.js')
        const utonomaContractForSignedTransactions = await appkit.utonomaContract
        alertCashRewardRequest($container)
        const harvestLikesReq = await utonomaContractForSignedTransactions.harvestLikes([identifierIndex, identifierContentType])
        alertCashRewardSent($container)
        const harvestLikesResp = await harvestLikesReq.wait()
        console.log(harvestLikesResp)
      } catch (error) {
        console.log(error)
        alertUserNotLoggedIn($container)
      }

      $container.classList.remove('Card__container--glow')
      $container.querySelector('.Card__actionButton').style.display = 'none'
    })
  }
  else {
    $template.querySelector('.Card__actionButton').style.display = 'none' //remove button if content is not harvestable
  }

  const alertCashRewardRequest = ($container) => {
    const $approveDialog = $container.querySelector('#dialogCashRewardRequest')
    $approveDialog.show()
    setTimeout(() => $approveDialog.close(), 5000)
  }

  const alertCashRewardSent = ($container) => {
    const $sentDialog = $container.querySelector('#dialogCashRewardSent')
    $sentDialog.show()
    setTimeout(() => $sentDialog.close(), 5000)
  }

  const alertUserNotLoggedIn = ($container) => {
    const $errorDialog = $container.querySelector('#dialogCashRewardError')
    $errorDialog.show()
    setTimeout(() => { 
      $errorDialog.close() 
      window.location.replace('/#rightPanelContainer')
    }, 8000)
  }

  return $template
}