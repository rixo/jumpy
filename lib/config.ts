'use babel'

export enum Theme {
  Default = 'default',
  HighContrast = 'high-contrast',
  Vimium = 'vimium',
}

export interface Config {
  numKeys: number
  fontSize: number
  theme: Theme
  useHomingBeaconEffectOnJumps: boolean
  allUppercase: boolean
  useEditorFontFamily: boolean
  hideMatchedChars: boolean
  // matchPattern: string
  wordsPattern: RegExp
  treeViewAutoSelect: boolean
  preferAlternateHands: boolean
  smartCaseMatch: boolean
  customKeys: string[]
  customKeysLeft: string[]
  customKeysRight: string[]
  flashNoMatch: boolean
}

export const parseConfig = (config): Config => ({
  numKeys: 2,
  fontSize: `${config.fontSize * 100}%`,
  wordsPattern: new RegExp(config.matchPattern, 'g'),
  treeViewAutoSelect: true,
  useBuiltInRegexMatchAllTheThings:
    config.useBuiltInRegexMatchAllTheThings !== false,
  htmlTargetSelectors: [ // TODO config
    'a',
    'button:not([tabIndex="-1"])',
    'input:not([tabIndex="-1"])',
    'select',
    'atom-text-editor',
    // we can't use .package-card selector directly because it
    // matches the (unclickable) card in top of package detail
    '.sub-section .package-card', // "Packages" section
    '.section.packages .package-card', // "Installed" section
    '.sub-section-heading.has-items$right',
    '.repo-link',
    '.clickable',
  ],
  ...config,
})

export default {
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
  flashNoMatch: {
    description: "Flash when there is no match.",
    type: 'boolean',
    default: false,
  },
}
