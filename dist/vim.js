'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// export const setup = ({getClass: () => Object}) => {
exports.setup = (jumpy, vim) => {
    const { getClass, registerCommandFromSpec } = vim;
    const Motion = getClass('Motion');
    const charsMax = Number.MAX_VALUE;
    const purpose = 'jumpy';
    class VimJump extends Motion {
        constructor() {
            super(...arguments);
            this.inclusive = true;
            this.requireInput = true;
        }
        initialize() {
            const { jumpyView } = jumpy;
            if (!jumpyView) {
                this.cancelOperation();
                return;
            }
            jumpyView.toggle((label) => {
                if (label.hasOwnProperty('lineNumber')) {
                    this.input = label;
                    this.processOperation();
                    return false;
                }
            });
        }
        moveCursor() {
            this.input.jump();
        }
    }
    registerCommandFromSpec('VimJump', {
        getClass: className => {
            if (className === 'VimJump') {
                return VimJump;
            }
            else {
                throw new Error(`No class ${className} here!`);
            }
        },
        prefix: 'jumpy',
        scope: 'atom-text-editor',
    });
};
//# sourceMappingURL=vim.js.map