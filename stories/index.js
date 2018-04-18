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

const aliceDocument =
	sampleText.alice.reduce((doc, text, idx) => R.pipe(
		Doc.push(`p${idx}`, Paragraph.empty),
		Doc.set(
			`p${idx}`,
			Paragraph.fromArray([{
				key: UUID(),
				value: Content.make(text, {})
			}])),
	)(doc), Doc.empty);

const stylesDocument =
	R.pipe(
		Doc.push(
			`p`,
			Paragraph.fromArray([
				{
					key: UUID(),
					value: Content.make(
						'Bold, ',
						{ bold: true })
				},
				{
					key: UUID(),
					value: Content.make(
						'italic, ',
						{ italic: true })
				},
				{
					key: UUID(),
					value: Content.make(
						'and links.',
						{ link: 'https://notion.so/' })
				},
				{
					key: UUID(),
					value: Content.make(
						' Even',
						{ bold: true, italic: true })
				},
				{
					key: UUID(),
					value: Content.make(
						' mixed',
						{ italic: true, link: 'https://notion.so/' })
				},
				{
					key: UUID(),
					value: Content.make(
						' styles',
						{ bold: true, link: 'https://notion.so/' })
				},
				{
					key: UUID(),
					value: Content.make(
						' work.',
						{ italic: true, bold: true, link: 'https://notion.so/' })
				},
			])),
	)(Doc.empty);

const initialEditor = Editor.make(null);

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

