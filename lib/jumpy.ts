'use babel';

import config from './config'

module.exports = {
  config,
  activate() {
    // lazy load implementation
    const Core = require('./atom/core').default
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
    const {setup} = require('./interop-vim-mode-plus-motion');
    setup(this, vim);
  }
};
