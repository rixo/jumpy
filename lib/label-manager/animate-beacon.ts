'use babel'

export default (
  target: HTMLElement,
  delay: boolean|number = false,
): void => {
  const beacon = document.createElement('div')
  const {style, classList} = beacon
  classList.add('jumpy-beacon')
  const {top, left, width, height} = target.getBoundingClientRect()
  style.left = left + width / 2 + 'px'
  style.top = top + height / 2 + 'px'
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
