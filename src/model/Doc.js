import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';
import * as Edit from './Edit';
import * as Range from './Range';

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
function splitParagraph(position, doc) {
	const paragraphIndex = R.pipe(
		R.view(lenses.paragraphOrder),
		R.indexOf(position.paragraphID)
	)(doc);

	const beforeSplitParagraphID = UUID();
	const afterSplitParagraphID = UUID();

	const { before, after } =
		Paragraph.split(
			position.offset,
			R.view(lenses.paragraphForID(position.paragraphID), doc));

	return R.pipe(
		d => insertPremadeParagraph(
			beforeSplitParagraphID,
			paragraphIndex,
			before,
			d),
		d => insertPremadeParagraph(
			afterSplitParagraphID,
			// The original paragraph has shuffled up an index;
			// to index past it, increment its original index once to 
			// represent that shuffle, and once to move past it.
			paragraphIndex + 2,
			after,
			d),
		d => removeParagraph(position.paragraphID, d)
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

// removeText :: (Range, Doc) -> Doc
function removeText(range, doc) {
	return R.over(
		// TODO: Handle multiple paragraphs
		lenses.paragraphForID(range.start.paragraphID),
		p => Paragraph.removeText(range.start.offset, range.end.offset, p),
		doc);
}

// removeText :: (DocPosition, string, Doc) -> Doc
function insertText(position, text, doc) {
	return R.over(
		lenses.paragraphForID(position.paragraphID),
		p => Paragraph.insertText(text, position.offset, p),
		doc);
}

// applyEdit :: (Edit, Doc) -> Doc
function applyEdit(edit, doc) {
	if (edit.type === Edit.types.replaceText) {
		const positionRange =
			positionRangeFromSelection(edit.selection, doc);

		return R.pipe(
			d => insertText(positionRange.end, edit.text, d),
			d => removeText(positionRange, d),
		)(doc);
	} else if (edit.type === Edit.types.replaceTextWithParagraphBreak) {
		const positionRange =
			positionRangeFromSelection(edit.selection, doc);
		const newParagraphID =
			UUID();

		return R.pipe(
			d => splitParagraph(
				positionRange.end,
				d),
			/*
			d => insertParagraph(
				newParagraphID,
				indexOfParagraph(positionRange.end.paragraphID, d) + 1,
				d),
			d => removeText(positionRange, d),
				*/
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

// sortPositionsAscending :: ([DocPosition], Doc) -> [DocPosition]
// Sorts the specified positions, with positions closer to the beginning of
// the doc occurring closer to the beginning of the sorted list.
function sortPositionsAscending(positions, doc) {
	return R.sortWith([
		R.ascend(position => doc.paragraphOrder.indexOf(position.paragraphID)),
		R.ascend(position => position.offset)
	], positions);
}

function positionRangeFromSelection(selection, doc) {
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
	positionRangeFromSelection,
};

