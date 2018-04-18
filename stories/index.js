import React from 'react';
import styled, { css } from 'styled-components';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { withState } from '@dump247/storybook-state';
import Composer, { Doc, Editor } from '../src';
import { aliceDocument, stylesDocument, initialEditor } from './initialStates';


storiesOf('Composer', module)
  .add('basic', withState({ doc: aliceDocument, editor: initialEditor }, (store) => (
		<Composer
			document={store.state.doc}
			selection={store.state.editor.selection}
			onEdit={edit => {
				const doc = Doc.applyEdit(edit, store.state.doc);
				const newState = {
					doc,
					editor: Editor.applyEdit(
						edit,
						store.state.doc,
						doc,
						store.state.editor),
				};
				console.log("Did update state:", newState);
				store.set(newState);
			}}
		/>
  )))
  .add('text decoration', withState({ doc: stylesDocument, editor: initialEditor }, (store) => (
		<Composer
			document={store.state.doc}
			selection={store.state.editor.selection}
			onEdit={edit => {
				const doc = Doc.applyEdit(edit, store.state.doc);
				const newState = {
					doc,
					editor: Editor.applyEdit(
						edit,
						store.state.doc,
						doc,
						store.state.editor),
				};
				console.log("Did update state:", newState);
				store.set(newState);
			}}
		/>
  )))

