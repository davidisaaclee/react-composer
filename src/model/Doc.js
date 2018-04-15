import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';
import * as Edit from './Edit';
import * as Range from './Range';
import * as DocPointer from './DocPointer';
import * as DocPosition from './DocPosition';

const lenses = {
	paragraphOrder: R.lensProp('paragraphOrder'),
	allParagraphs: R.lensProp('allParagraphs'),
	paragraphForID: id => R.compose(lenses.allParagraphs, R.lensProp(id)),
};

function make(paragraphOrder, allParagraphs) {
	return { paragraphOrder, allParagraphs };
}

// empty :: Doc
const empty = make([], {});

// indexOfParagraph :: (ParagraphID, Doc) -> number?
function indexOfParagraph(paragraphID, doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.indexOf(paragraphID)
	)(doc);
}

// idForParagraphAtIndex :: (number, Doc) -> ParagraphID?
function idForParagraphAtIndex(index, doc) {
	return R.view(
		R.compose(
			lenses.paragraphOrder,
			R.lensIndex(index)
		),
	)(doc);
}

// containsPosition :: (DocPosition, Doc) -> boolean
function containsPosition(position, doc) {
	const paragraphID =
		idForParagraphAtIndex(position.paragraphIndex, doc);

	if (paragraphID == null) {
		return false;
	}

	const paragraph =
		R.view(lenses.paragraphForID(paragraphID))(doc);

	if (position.offset < 0 || position.offset >= Paragraph.content(paragraph).length) {
		return false;
	}

	return true;
}

// containsPointer :: (DocPointer, Doc) -> boolean
function containsPointer(pointer, doc) {
	const paragraph =
		R.view(lenses.paragraphForID(pointer.paragraphID))(doc);

	if (paragraph == null) {
		return false;
	}

	if (pointer.offset < 0 || pointer.offset >= Paragraph.content(paragraph).length) {
		return false;
	}

	return true;
}

// pointerFromPosition :: (DocPosition, Doc) -> DocPointer
function pointerFromPosition(position, doc) {
	return DocPointer.make(
		idForParagraphAtIndex(position.paragraphIndex, doc),
		position.offset);
}

// positionFromPointer :: (DocPointer, Doc) -> DocPosition
function positionFromPointer(pointer, doc) {
	return DocPosition.make(
		indexOfParagraph(pointer.paragraphID, doc),
		pointer.offset);
}

// insertParagraph :: (ParagraphID, number, Doc) -> Doc
// Inserts an empty paragraph at the specified index, shuffling
// the paragraph in that position and above to higher indices.
function insertParagraph(id, index, doc) {
	return insertPremadeParagraph(id, index, Paragraph.empty, doc);
}

// insertPremadeParagraph :: (ParagraphID, number, Doc) -> Doc
// Inserts an empty paragraph at the specified index, shuffling
// the paragraph in that position and above to higher indices.
// TODO: Make this the default `insertParagraph`;
// change `insertParagraph` to `insertEmptyParagraph` or remove
function insertPremadeParagraph(id, index, paragraph, doc) {
	return R.pipe(
		R.set(lenses.paragraphForID(id), paragraph),
		R.over(lenses.paragraphOrder, R.insert(index, id))
	)(doc);
}

// appendParagraph :: (ParagraphID, Doc) -> Doc
// Inserts an empty paragraph at the end of the paragraph list.
function appendParagraph(id, doc) {
	const indexPastEnd =
		R.pipe(R.view(lenses.paragraphOrder), R.length)(doc);

	return insertParagraph(
		id,
		indexPastEnd,
		doc);
}

function setParagraphContent(id, content, doc) {
	return R.over(
		lenses.paragraphForID(id),
		paragraph => content,
		doc);
}

// splitParagraph :: (DocPosition, Doc) -> Doc
function splitParagraph(splitPosition, doc) {
	const beforeSplitParagraphID = UUID();
	const afterSplitParagraphID = UUID();

	const paragraphIDContainingSplitPoint =
		idForParagraphAtIndex(
			splitPosition.paragraphIndex,
			doc);

	const { before, after } =
		Paragraph.split(
			splitPosition.offset,
			R.view(lenses.paragraphForID(paragraphIDContainingSplitPoint), doc));

	return R.pipe(
		d => insertPremadeParagraph(
			beforeSplitParagraphID,
			splitPosition.paragraphIndex,
			before,
			d),
		d => insertPremadeParagraph(
			afterSplitParagraphID,
			// The original paragraph has shuffled up an index;
			// to index past it, increment its original index once to 
			// represent that shuffle, and once to move past it.
			splitPosition.paragraphIndex + 2,
			after,
			d),
		d => removeParagraph(
			paragraphIDContainingSplitPoint,
			d),
	)(doc);
}

// removeParagraph :: (ParagraphID, Doc) -> Doc
function removeParagraph(id, doc) {
	const paragraphIndex = R.pipe(
		R.view(lenses.paragraphOrder),
		R.indexOf(id)
	)(doc);

	return R.pipe(
		// Remove from order list.
		R.over(
			lenses.paragraphOrder,
			R.remove(paragraphIndex, 1)),
		// Remove from paragraph dictionary.
		R.over(
			lenses.allParagraphs,
			R.dissoc(id))
	)(doc);
}

// removeText :: (Range DocPointer, Doc) -> Doc
function removeText(range, doc) {
	return R.over(
		// TODO: Handle multiple paragraphs
		lenses.paragraphForID(range.start.paragraphID),
		p => Paragraph.removeText(range.start.offset, range.end.offset, p),
		doc);
}

// removeText :: (DocPointer, string, Doc) -> Doc
function insertText(pointer, text, doc) {
	return R.over(
		lenses.paragraphForID(pointer.paragraphID),
		p => Paragraph.insertText(text, pointer.offset, p),
		doc);
}

// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	if (edit.type === Edit.types.replaceText) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);

		return R.pipe(
			d => insertText(pointerRange.end, edit.text, d),
			d => removeText(pointerRange, d),
		)(doc);
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const pointerRange =
			pointerRangeFromSelection(edit.selection, doc);
		
		// TODO: Offset to account for removal
		const splitPosition =
			positionFromPointer(pointerRange.end, doc);

		return R.pipe(
			// TODO: Remove selection
			/*
			d => removeText(
				pointerRange,
				d),
				*/
			d => splitParagraph(
				splitPosition,
				d),
		)(doc);
	} else {
		console.error("Unhandled edit type:", edit.type);
		return doc;
	}
}

// paragraphList :: Doc -> [{ id: ParagraphID, paragraph: Paragraph }]
function paragraphList(doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.map(id => ({ id, paragraph: R.view(lenses.paragraphForID(id), doc) }))
	)(doc);
}

// sortPositionsAscending :: ([DocPointer], Doc) -> [DocPointer]
// Sorts the specified pointers, with pointers closer to the beginning of
// the doc occurring closer to the beginning of the sorted list.
function sortPositionsAscending(pointers, doc) {
	return R.sortWith([
		R.ascend(pointer => doc.paragraphOrder.indexOf(pointer.paragraphID)),
		R.ascend(pointer => pointer.offset)
	], pointers);
}

// pointerRangeFromSelection :: (DocSelection, Doc) -> Range DocPointer
function pointerRangeFromSelection(selection, doc) {
	const [start, end] =
		sortPositionsAscending([selection.anchor, selection.focus], doc);

	return Range.make(start, end);
}

export {
	lenses,
	make,
	empty,
	indexOfParagraph,
	appendParagraph,
	setParagraphContent,
	applyEdit,
	paragraphList,
	sortPositionsAscending,
	pointerRangeFromSelection,
};

