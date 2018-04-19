# react-composer

**This is a work in progress. It's probably not a good idea to use this in your project just yet.**
If you're looking for a rich text composer for React, I suggest [Draft.js](https://draftjs.org).

A React component for composing rich text. Includes implementation of models
for managing the document and editing state.

```jsx
import Composer, { Doc, Editor } from '@davidisaaclee/react-composer';

let docState = Doc.empty;

// Begin with a null (empty) selection.
let editorState = Editor.make(null);

<Composer
  document={docState}
  selection={editorState.selection}
  onEdit={edit => {
    let newDocState = Doc.applyEdit(edit, docState);
    let newEditorState = Editor.applyEdit(
      edit,
      docState,
      newDocState,
      editorState);

    docState = newDocState;
    editorState = newEditorState;

    rerender();
  }}
  onSelectionChange={selection => {
    editorState = { ...editorState, selection };

    rerender();
  }
  onAddLink={completion => {
    promptUserForLinkURL(completion);
  }}
  stylesForReplacingTextAtSelection={(selection, docState) => {
    return Doc.stylesForSelection(selection, docState);
  }}
/>
```

## Development

```sh
# Clone repository.
git clone https://github.com/davidisaaclee/react-composer
cd react-composer

# Build for ES modules and CommonJS.
yarn build

# Run Storybook demo on localhost:9001.
yarn run storybook

# Run Storybook demo on localhost:8888.
yarn run storybook -p 8888
```

