'use babel'

import {LabelPosition} from '../../label-interface'

const px = num => `${num}px`

type parseCssPosition = (position: LabelPosition) => CssPosition

type CssPosition = {
  top?: string
  bottom?: string
  left?: string
  right?: string
}

interface xyOrCssPosition extends CssPosition {
  x?: number
  y?: number
}

const parseCssPosition = (arg: xyOrCssPosition) => {
  const {x, y, ...cssPosition} = arg
  if (typeof x !== 'undefined') {
    return {left: px(x), top: px(y)}
  } else {
    return cssPosition
  }
}

export default parseCssPosition
