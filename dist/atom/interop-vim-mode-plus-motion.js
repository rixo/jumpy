'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = (jumpy, vim) => {
    const { getClass, registerCommandFromSpec } = vim;
    const Motion = getClass('Motion');
    class VimJump extends Motion {
        constructor() {
            super(...arguments);
            this.inclusive = true;
            this.requireInput = true;
        }
        initialize() {
            const { core } = jumpy;
            if (!core) {
                this.cancelOperation();
                return;
            }
            const onJump = ({ label }) => {
                // we MUST give a value to input prop in order for
                // processOperation to work
                this.input = label;
                this.processOperation();
                return false; // prevent regular jump
            };
            const onCancel = () => {
                this.cancelOperation();
            };
            core.getStateMachine().api.activate(onJump, onCancel);
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
//# sourceMappingURL=interop-vim-mode-plus-motion.js.map