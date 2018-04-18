import * as R from 'ramda';
import UUID from 'uuid';
import { Doc, Editor } from '../src';
import Paragraph from '../src/model/Paragraph';
import * as Content from '../src/model/Content';
import * as sampleText from './sampleText';

export const aliceDocument =
	sampleText.alice.reduce((doc, text, idx) => R.pipe(
		Doc.push(`p${idx}`, Paragraph.empty),
		Doc.set(
			`p${idx}`,
			Paragraph.fromArray([{
				key: UUID(),
				value: Content.make(text, {})
			}])),
	)(doc), Doc.empty);

export const stylesDocument =
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

export const initialEditor = Editor.make(null);

