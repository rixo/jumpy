'use babel'

import createHtmlLabeler from './create-html-labeler'

export default createHtmlLabeler({
  viewClassFiles: [
    'find-and-replace/lib/find-view',
    'find-and-replace/lib/project-find-view',
  ]
})
