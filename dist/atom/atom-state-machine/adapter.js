'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adapter_keyboard_1 = require("./adapter-keyboard");
const adapter_labels_1 = require("./adapter-labels");
const adapter_status_1 = require("./adapter-status");
const adapter_focus_1 = require("./adapter-focus");
exports.createAdapter = ({ statusBar, onBlur, onKey }) => {
    const focus = adapter_focus_1.default();
    const keyboard = adapter_keyboard_1.default({ onBlur, onKey });
    const labels = adapter_labels_1.default();
    const { adapter: status = {}, destroy: destroyStatus = () => { }, } = statusBar && adapter_status_1.default(statusBar) || {};
    const adapter = Object.assign({}, focus, keyboard, labels, status || {});
    const destroy = () => {
        destroyStatus();
    };
    return { adapter, destroy };
};
//# sourceMappingURL=adapter.js.map