'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_html_labeler_1 = require("./create-html-labeler");
const simulateMouseDown = el => {
    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent('mousedown', true, true);
    el.dispatchEvent(clickEvent);
};
exports.default = create_html_labeler_1.default({
    isTrackedView: item => {
        if (!item.getElement)
            return false;
        const el = item.getElement();
        if (!el) {
            return false;
        }
        return el.classList.contains('github-StubItem-git-tab-controller');
    },
    jump: ({ targetEl: el }) => {
        simulateMouseDown(el);
        // focus github pane (yes, hrmm... coud do better) FIXME
    }
});
//# sourceMappingURL=github-pane.js.map