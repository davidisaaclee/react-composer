import * as R from 'ramda';

/* An anchor represents a position in the document between two characters.
 * An anchor with offset n refers to the position between the nth and
 * (n-1)th character in the specified paragraph.
 */

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

