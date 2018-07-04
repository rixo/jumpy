/**
 * Atom Jumpy package. The actual implementation in done in atom-jumpy
 * module, allowing for lazy loading of the brunt of this package weight
 * on first activation.
 */

'use babel'

import config from './config'

module.exports = {
  config,
  activate() {
    // lazy load implementation
    const Core = require('./atom/atom-jumpy').default
    this.core = Core()
    this.core.activate()
  },
  deactivate() {
    this.core.deactivate()
  },
  consumeStatusBar(statusBar) {
    this.core.setStatusBar(statusBar)
  },
  consumeVimModePlus(vim) {
    // lazy load optional vim-mode-plus integation
    const {setup} = require('./atom/interop-vim-mode-plus-motion')
    setup(this, vim)
  },
}
