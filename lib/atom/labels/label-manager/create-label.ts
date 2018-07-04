'use babel'

import {Config} from '../../../config'

const majStart = 'A'.charCodeAt(0)
const majEnd = 'Z'.charCodeAt(0)
export const isMaj = k => {
  const charCode = k.charCodeAt(0)
  return charCode >= majStart && charCode <= majEnd
}

export default (
  keyLabel: string,
  {}: Config,
) => {
  const labelElement = document.createElement('div');
  labelElement.classList.add('jumpy-label'); // For styling and tests
  for (const k of keyLabel) {
    const span = document.createElement('span')
    span.textContent = k
    span.classList.add('jumpy-key')
    // span.style.width = `${Math.max(5, textEditor.defaultCharWidth - 1)}px`
    if (isMaj(k)) {
      span.classList.add('uppercase')
    }
    labelElement.appendChild(span)
  }
  return labelElement
}
