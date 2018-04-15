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

const empty = make([], {});

function appendParagraph(id = UUID(), doc) {
	return R.pipe(
		R.set(lenses.paragraphForID(id), Paragraph.empty),
		R.over(lenses.paragraphOrder, R.append(id))
	)(doc);
}

function setParagraphContent(id, content, doc) {
	return R.over(
		lenses.paragraphForID(id),
		paragraph => content,
		doc);
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
	switch (edit.type) {
		case Edit.types.replaceText:
			const positionRange =
				positionRangeFromSelection(edit.selection, doc);

			return R.pipe(
				d => insertText(positionRange.end, edit.text, d),
				d => removeText(positionRange, d),
			)(doc);
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
	appendParagraph,
	setParagraphContent,
	applyEdit,
	paragraphList,
	sortPositionsAscending,
	positionRangeFromSelection,
};

