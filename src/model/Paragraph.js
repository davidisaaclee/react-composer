import * as R from 'ramda';

// Content ::= string

const lenses = {
	content: R.identity,
};

const make = content => content;
const empty = make('');

// content :: Paragraph -> Content
const content = R.view(lenses.content);

const insertText = (text, offset, paragraph) =>
	R.over(
		lenses.content,
		content => content.slice(0, offset) + text + content.slice(offset)
	)(paragraph);

const appendText = (text, paragraph) =>
	insertText(text, content(paragraph).length, paragraph);

const removeText = (startOffset, endOffset, paragraph) =>
	R.over(
		lenses.content,
		content => content.slice(0, startOffset) + content.slice(endOffset)
	)(paragraph);

// split :: (number, Paragraph) -> { before: Paragraph, after: Paragraph }
const split = (offset, paragraph) => ({
	before: make(content(paragraph).slice(0, offset)),
	after: make(content(paragraph).slice(offset)),
});

// merge :: (Paragraph, Paragraph) -> Paragraph
const merge = (p1, p2) => appendText(content(p2), p1);

export {
	make,
	empty,
	content,
	insertText,
	appendText,
	removeText,
	split,
	merge,
};

