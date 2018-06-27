'use babel';

import config from './config'

module.exports = {
  config,
  // jumpyView: null,
  // activate(state: any) {
  activate() {
    // lazy load implementation
    const Core = require('./atom/core').default
    this.core = Core()
    this.core.activate()
    // const JumpyView = require('./jumpy-view').default;
    // this.jumpyView = new JumpyView(state.jumpyViewState);
  },
  deactivate() {
    this.core.deactivate()
    // if (this.jumpyView) {
    //   this.jumpyView.destroy();
    // }
    // this.jumpyView = null;
  },
  // serialize() {
  //   return {
  //     jumpyViewState: this.jumpyView.serialize()
  //   };
  // },
  consumeToolbar(toolbar) {
    // TODO use status bar API
    // this.statusBar = toolbar
    // this.core.consumeToolbar(toolbar)
  },
  consumeVimModePlus(vim) {
    // lazy load optional vim-mode-plus integation
    const {setup} = require('./vim');
    setup(this, vim);
  }
};
