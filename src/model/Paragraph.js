import * as R from 'ramda';

const lenses = {
	content: R.identity,
};

const make = content => content;
const empty = make('');

const content = R.view(lenses.content);

const insertText = (text, offset, paragraph) =>
	R.over(
		lenses.content,
		content => content.slice(0, offset) + text + content.slice(offset)
	)(paragraph);

export {
	make,
	empty,
	content,
	insertText,
};

