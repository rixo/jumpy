'use babel';

// import JumpyView from './jumpy-view';

module.exports = {

    jumpyView: null,
    config: {
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
            {value: 'default', description: "Default"},
            {value: 'high-contrast', description: "High contrast"},
            {value: 'vimium', description: "Vimium"},
          ]
        },
        // highContrast: {
        //     description: 'This will display a high contrast label, \
        //     usually green.  It is dynamic per theme.',
        //     type: 'boolean',
        //     default: false,
        // },
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
    },

    activate(state: any) {
        // lazy load implementation
        const JumpyView = require('./jumpy-view').default;
        this.jumpyView = new JumpyView(state.jumpyViewState);
    },

    deactivate() {
        if (this.jumpyView) {
            this.jumpyView.destroy();
        }
        this.jumpyView = null;
    },

    serialize() {
        return {
            jumpyViewState: this.jumpyView.serialize()
        };
    },

    consumeToolbar(toolbar) {
      // TODO use status bar API
      this.statusBar = toolbar
    },

    consumeVimModePlus(vim) {
        // lazy load optional vim-mode-plus integation
        const {setup} = require('./vim');
        setup(this, vim);
    }
};
