'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ({ onBlur, onKey }) => {
    const keyEventsElement = document.body;
    const grabKeyboard = () => {
        keyEventsElement.addEventListener('keydown', onKeydown, true);
        if (onBlur) {
            for (const e of ['blur', 'click', 'scroll']) {
                keyEventsElement.addEventListener(e, onBlur, true);
            }
        }
    };
    const releaseKeyboard = () => {
        keyEventsElement.removeEventListener('keydown', onKeydown, true);
        if (onBlur) {
            for (const e of ['blur', 'click', 'scroll']) {
                keyEventsElement.removeEventListener(e, onBlur, true);
            }
        }
    };
    const onKeydown = (event) => {
        // only test with `key`, not `code` because code may be
        // misleading on some international keyboard layouts for
        // example, 'm' key on FR azerty reports as code 'Semicolon')
        const { key, metaKey, ctrlKey, altKey, shiftKey } = event;
        // if (metaKey || ctrlKey || altKey) {
        //   return
        // }
        if (/^[A-Za-z]{1}$/.test(key)) {
            event.preventDefault();
            event.stopPropagation();
            onKey({ key, ctrlKey, altKey, shiftKey, metaKey });
        }
    };
    return { grabKeyboard, releaseKeyboard };
};
//# sourceMappingURL=actions-keyboard.js.map