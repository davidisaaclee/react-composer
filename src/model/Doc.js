import * as R from 'ramda';
import UUID from 'uuid';
import * as Paragraph from './Paragraph';
import * as Edit from './Edit';

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

function replaceText(anchor, text, doc) {
	return R.over(
		lenses.paragraphForID(anchor.paragraphID),
		// TODO: Replace as well as insert
		paragraph => Paragraph.insertText(text, anchor.offset, paragraph),
		doc);
}

function applyEdit(edit, doc) {
	switch (edit.type) {
		case Edit.types.replaceText:
			// TODO: handle full selection
			return replaceText(edit.selection.focus, edit.text, doc);
	}
}

// paragraphList :: Doc -> [{ id: ParagraphID, paragraph: Paragraph }]
function paragraphList(doc) {
	return R.pipe(
		R.view(lenses.paragraphOrder),
		R.map(id => ({ id, paragraph: R.view(lenses.paragraphForID(id), doc) }))
	)(doc);
}

export {
	lenses,
	make,
	empty,
	appendParagraph,
	setParagraphContent,
	applyEdit,
	paragraphList,
};

