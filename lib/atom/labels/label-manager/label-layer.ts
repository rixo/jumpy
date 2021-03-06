'use babel'

import {Config} from '../../../config'
import {Label} from '../label'
import parseCssPosition from './parse-css-position'

type addLabel = (
  label: Label,
) => void

export interface LabelLayer {
  addLabel: addLabel
  render: () => void
  destroy: () => void
  element: HTMLElement
}

export const createLabelLayer = (settings: Config): LabelLayer => {
  const element = createLayerElement(settings)
  const addLabel = createAddLabel(element)
  const render = () => document.body.appendChild(element)
  const destroy = () => element.remove()
  return {
    get element() {return element},
    addLabel,
    render,
    destroy,
  }
}

const createLayerElement = (settings) => {
  const {
    theme,
    fontSize,
    allUppercase,
    hideMatchedChars,
    useEditorFontFamily,
  } = settings
  const layer = document.createElement('div')
  const {classList, style} = layer
  classList.add('jumpy-layer')
  classList.add(`jumpy-theme-${theme}`)
  if (allUppercase) {
    classList.add('jumpy-all-uppercase')
  }
  if (hideMatchedChars) {
    classList.add('jumpy-hide-matched-chars')
  }
  if (useEditorFontFamily) {
    style.fontFamily = atom.config.get('editor.fontFamily')
  }
  style.fontSize = fontSize;
  return layer
}

const createAddLabel = (layerElement: HTMLElement): addLabel => (
  label: Label
) => {
  const {labelPosition, element} = label
  const cssPosition = parseCssPosition(labelPosition)
  Object.assign(element.style, cssPosition)
  layerElement.appendChild(element)
}
