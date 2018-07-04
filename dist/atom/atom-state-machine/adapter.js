'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_keyboard_1 = require("./actions-keyboard");
const actions_labels_1 = require("./actions-labels");
const actions_status_1 = require("./actions-status");
const actions_focus_1 = require("./actions-focus");
exports.createAdapter = ({ statusBar, onBlur, onKey }) => {
    const focus = actions_focus_1.default();
    const keyboard = actions_keyboard_1.default({ onBlur, onKey });
    const labels = actions_labels_1.default();
    const { adapter: status = {}, destroy: destroyStatus = () => { }, } = statusBar && actions_status_1.default(statusBar) || {};
    const adapter = Object.assign({}, focus, keyboard, labels, status || {});
    const destroy = () => {
        destroyStatus();
    };
    return { adapter, destroy };
};
//# sourceMappingURL=adapter.js.map