'use babel'

import {Label} from '../../label-interface'
import parseCssPosition from './parse-css-position'

export type animateBeaconType = (label: Label) => void

const animateBeacon: animateBeaconType = (label: Label) => {
  let options
  if (label.animateBeacon) {
    if (typeof label.animateBeacon === 'function') {
      const handler = <Function> label.animateBeacon
      handler.call(label)
    } {
      options = label.animateBeacon
    }
  }
  const {delay, cssClass} = options || <any> {}

  const beacon = document.createElement('div')
  const {style, classList} = beacon
  classList.add('jumpy-beacon')
  Object.assign(style, parseCssPosition(label.labelPosition))
  if (cssClass) {
    classList.add(cssClass)
  }
  const display = () => {
    document.body.appendChild(beacon)
    setTimeout(() => beacon.remove(), 150)
  }
  if (delay === false) {
    display()
  } else {
    setTimeout(display, delay)
  }
}

export default animateBeacon
