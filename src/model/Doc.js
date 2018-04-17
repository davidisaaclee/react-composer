import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';
import * as Edit from './Edit';
import * as Range from './Range';

import OSD from '../utility/OrderedSubdivisibleDictionary';

// ParagraphDict ::= OrderedSubdivisibleDictionary ParagraphID Paragraph
const ParagraphDict = OSD({
	count: Paragraph.characterCount,

	containsIndex: (index, p) => index >= 0 && index < Paragraph.characterCount(p),
	
	// TODO: better implementation of slice, merge
	slice: (start, end, p) => Paragraph.appendContent(
		Paragraph.plainTextContent(Paragraph.contents(p)[0].text.slice(start, end)),
		Paragraph.empty),

	merge: Paragraph.merge,
});


const make = (order, all) => ParagraphDict.fromArray(order.map(k => all[k]));
const empty = make([], {});

const indexOfParagraph =
	ParagraphDict.indexOf;

const appendParagraph = (paragraph, doc) => 
	ParagraphDict.push(paragraph, Paragraph.empty, doc);

// setParagraphContents :: (ParagraphID, [Paragraph.Content], Doc) -> Doc
const setParagraphContents = (paragraphID, contents, doc) => ParagraphDict.update(
	paragraphID,
	paragraph => Paragraph.make(contents),
	doc);

// pointerRangeFromSelection :: (DocSelection, Doc) -> Range OSD.Position
function pointerRangeFromSelection(selection, doc) {
	const [start, end] =
		ParagraphDict.sortPointersAscending(
			[
				ParagraphDict.makePointer(
					selection.anchor.paragraphID,
					selection.anchor.offset),
				ParagraphDict.makePointer(
					selection.focus.paragraphID,
					selection.focus.offset),
			],
			doc);

	return Range.make(start, end);
}

// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);

		return R.pipe(
			ParagraphDict.removeSlice(
				ParagraphDict.positionFromPointer(pointerRange.start, doc),
				ParagraphDict.positionFromPointer(pointerRange.end, doc),
				UUID(),
				UUID(),
			),
			ParagraphDict.update(
				pointerRange.start.key,
				paragraph => Paragraph.insertContent(
					Paragraph.plainTextContent(edit.text),
					pointerRange.start.offset,
					paragraph))
		)(doc);
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);
		const splitPosition =
			ParagraphDict.positionFromPointer(
				ParagraphDict.makePointer(
					pointerRange.start.paragraphID,
					pointerRange.start.offset),
				doc); 

		return R.pipe(
			ParagraphDict.removeSlice(
				ParagraphDict.positionFromPointer(pointerRange.start, doc),
				ParagraphDict.positionFromPointer(pointerRange.end, doc)),
			ParagraphDict.splitElement(
				splitPosition,
				UUID(),
				UUID())
		)(doc);
	} else {
		console.error("Unhandled edit type:", edit.type);
		return doc;
	}
}

function paragraphList(doc) {
	return ParagraphDict.toList(doc)
		.map(({ key, value }) => ({ id: key, paragraph: value }));
}

export default {
	...ParagraphDict,
	indexOfParagraph,
	appendParagraph,
	setParagraphContents,
	applyEdit,
	paragraphList,
	pointerRangeFromSelection,
};

