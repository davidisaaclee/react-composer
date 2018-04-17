import * as R from 'ramda';
import React from 'react';
import styled, { css } from 'styled-components';
import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import { withState } from '@dump247/storybook-state';
import UUID from 'uuid';
import Composer, { Doc, Editor } from '../src';
import Paragraph from '../src/model/Paragraph';
import * as Content from '../src/model/Content';
import * as sampleText from './sampleText';

const initialDocument =
	sampleText.alice.reduce((doc, text, idx) => R.pipe(
		Doc.push(`p${idx}`, Paragraph.empty),
		Doc.set(
			`p${idx}`,
			Paragraph.fromArray([{
				key: UUID(),
				value: Content.plainText(text)
			}])),
	)(doc), Doc.empty);

const initialEditor = Editor.make(null);

storiesOf('Composer', module)
  .add('basic', withState({ doc: initialDocument, editor: initialEditor }, (store) => (
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

