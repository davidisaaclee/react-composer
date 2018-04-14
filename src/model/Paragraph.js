import * as R from 'ramda';

const make = content => content;
const empty = make('');

const content = R.identity;

export {
	make,
	empty,
	content
};

