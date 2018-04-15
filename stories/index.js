import * as R from 'ramda';
import React from 'react';
import styled, { css } from 'styled-components';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { withState } from '@dump247/storybook-state';
import UUID from 'uuid';
import RichText from '../src';
import * as Doc from '../src/model/Doc';
import * as Editor from '../src/model/Editor';
import * as sampleText from './sampleText';

const initialDocument = R.pipe(
	d => Doc.appendParagraph('p1', d),
	d => Doc.appendParagraph('p2', d),
	d => Doc.setParagraphContent('p1', sampleText.alice[0], d),
	d => Doc.setParagraphContent('p2', sampleText.alice[1], d),
)(Doc.empty);

const initialEditor = Editor.make(null);

storiesOf('RichText', module)
  .add('basic', withState({ doc: initialDocument, editor: initialEditor }, (store) => (
		<RichText
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

