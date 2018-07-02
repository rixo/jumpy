'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
module.exports = {
    config: config_1.default,
    activate() {
        // lazy load implementation
        const Core = require('./atom/core').default;
        this.core = Core();
        this.core.activate();
    },
    deactivate() {
        this.core.deactivate();
    },
    consumeStatusBar(statusBar) {
        this.core.setStatusBar(statusBar);
    },
    consumeVimModePlus(vim) {
        // lazy load optional vim-mode-plus integation
        const { setup } = require('./vim');
        setup(this, vim);
    }
};
//# sourceMappingURL=jumpy.js.map