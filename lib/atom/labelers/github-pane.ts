'use babel'

import createHtmlLabeler from './create-html-labeler'

const simulateMouseDown = el => {
  var clickEvent = document.createEvent('MouseEvents')
  clickEvent.initEvent('mousedown', true, true)
  el.dispatchEvent(clickEvent)
}

export default createHtmlLabeler({
  isTrackedView: item => {
    if (!item.getElement) return false
    const el = item.getElement()
    if (!el) {
      return false
    }
    return el.classList.contains('github-StubItem-git-tab-controller')
  },
  jump: ({targetEl: el}) => {
    simulateMouseDown(el)
    // focus github pane (yes, hrmm... coud do better) FIXME
  }
})
