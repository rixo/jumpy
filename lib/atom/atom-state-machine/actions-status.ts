'use babel'

import {StatusAdapter} from '../../state-machine'

export default (statusBar) => {

  const element = createTileItem()
  const statusElement = element.querySelector('.status')
  const tile = statusBar.addLeftTile({
    item: element,
    priority: -1,
  })

  const show = () => {
    element.style.display = 'inline-block'
  }
  const hide = () => {
    element.style.display = 'none'
  }
  const setStatus = status => {
    statusElement.innerHTML = status
    show()
  }

  const statusMatch = data => {
    element.classList.remove('no-match')
    setStatus(data.keys)
  }

  const statusNoMatch = () => {
    element.classList.add('no-match')
    setStatus('No Match!')
  }

  const statusClear = () => {
    setStatus('Jump mode!')
  }

  const statusIdle = () => {
    hide()
  }

  const adapter: StatusAdapter = {
    statusMatch,
    statusNoMatch,
    statusClear,
    statusIdle,
  }

  const destroy = () => {
    tile.destroy()
  }

  return {adapter, destroy}
}

const createTileItem = () => {
  const element = document.createElement('div')
  element.id = 'status-bar-jumpy'
  element.classList.add('inline-block')
  element.innerHTML = 'Jumpy: <span class="status"></span>'
  element.style.display = 'none'
  return element
}
