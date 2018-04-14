import * as R from 'ramda';

const lenses = {
	paragraphID: R.lensProp('paragraphID'),
	offset: R.lensProp('offset'),
};

// make :: (ParagraphID, number) -> Anchor
const make = (paragraphID, offset) => ({ paragraphID, offset });

function offsetBy(offset, anchor) {
	return R.over(lenses.offset, n => n + offset, anchor);
}

export {
	make,
	offsetBy,
};

