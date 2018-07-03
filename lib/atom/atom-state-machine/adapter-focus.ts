'use babel'

import {FocusAdapter} from '../../state-machine'

export default (): FocusAdapter => ({
  focus: () => {
    const workspaceEl = atom.views.getView(atom.workspace)
    workspaceEl.classList.add('jumpy-jump-mode')
  },
  blur: () => {
    const workspaceEl = atom.views.getView(atom.workspace)
    workspaceEl.classList.remove('jumpy-jump-mode')
  },
})
