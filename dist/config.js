'use babel';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Theme;
(function (Theme) {
    Theme["Default"] = "default";
    Theme["HighContrast"] = "high-contrast";
    Theme["Vimium"] = "vimium";
})(Theme = exports.Theme || (exports.Theme = {}));
exports.parseConfig = (config) => (Object.assign({ numKeys: 2, fontSize: `${config.fontSize * 100}%`, wordsPattern: new RegExp(config.matchPattern, 'g'), useBuiltInRegexMatchAllTheThings: config.useBuiltInRegexMatchAllTheThings !== false, htmlTargetSelectors: [
        'a',
        'button:not([tabIndex="-1"])',
        'input:not([tabIndex="-1"])',
        'select',
        'atom-text-editor',
        // we can't use .package-card selector directly because it
        // matches the (unclickable) card in top of package detail
        '.sub-section .package-card',
        '.section.packages .package-card',
        '.sub-section-heading.has-items$right',
        '.repo-link',
        '.clickable',
    ] }, config));
exports.default = {
    fontSize: {
        description: 'The font size of jumpy labels.',
        type: 'number',
        default: .75,
        minimum: 0,
        maximum: 1,
    },
    theme: {
        default: 'default',
        type: 'string',
        enum: [
            { value: 'default', description: "Default" },
            { value: 'high-contrast', description: "High contrast" },
            { value: 'vimium', description: "Vimium" },
        ]
    },
    useHomingBeaconEffectOnJumps: {
        description: 'This will animate a short lived homing beacon upon \
    jump.',
        type: 'boolean',
        default: true,
    },
    allUppercase: {
        description: "Label's letters are always uppercase, for better "
            + "visibility. Custom styling is applied to uppercase letters to "
            + "distinguish them (red by default).",
        type: 'boolean',
        default: false,
    },
    useEditorFontFamily: {
        description: "Use same font family as the editor.",
        type: 'boolean',
        default: false,
    },
    hideMatchedChars: {
        description: "Hide first matched character.",
        type: 'boolean',
        default: false,
    },
    matchPattern: {
        description: 'Jumpy will create labels based on this pattern.',
        type: 'string',
        default: '([A-Z]+([0-9a-z])*)|[a-z0-9]{2,}',
    },
    preferAlternateHands: {
        description: "Prefer labels that alternate left and right hands ("
            + "starting left). If enabled, customKeys will be ignored, in favor"
            + "of customKeysLeft and customKeysRight.",
        type: 'boolean',
        default: false,
    },
    smartCaseMatch: {
        description: "Match both lower and upper case characters when there "
            + "is no ambiguity (that is, when all possible matches for the typed "
            + "key are lower case, or they all are upper case)",
        type: 'boolean',
        default: false,
    },
    customKeys: {
        description: "Jumpy will use these characters in the specifed order"
            + " to create labels (comma separated).",
        type: 'array',
        default: [],
    },
    customKeysLeft: {
        description: "Custom keys for left (or first) hand, when "
            + "preferAlternateHands is `true`.",
        type: 'array',
        default: 'azertqsdfgwxcv'.split(''),
    },
    customKeysRight: {
        description: "Custom keys for right (or second) hand, when "
            + "preferAlternateHands is `true`.",
        type: 'array',
        default: 'uiophjklmn'.split(''),
    },
    flashNoMatch: {
        description: "Flash when there is no match.",
        type: 'boolean',
        default: false,
    },
    statusBar: {
        description: "Show Jumpy status in status bar.",
        type: 'boolean',
        default: true,
    },
    treeViewAutoSelect: {
        description: "Open tree view jump target immediately.",
        type: 'boolean',
        default: true,
    },
    treeViewCtrlKey: {
        description: "When enabled, pressing CTRL key while hitting the "
            + "last character of a label reverse the effects of current "
            + "configured tree view autoselect option.",
        type: 'boolean',
        default: true,
    },
    treeViewKeepFocus: {
        description: "Keep focus in tree view after jump, when tree"
            + " view autoselect is true. If autoselect is disabled, this"
            + " option is ignored.",
        type: 'boolean',
        default: false,
    },
};
//# sourceMappingURL=config.js.map