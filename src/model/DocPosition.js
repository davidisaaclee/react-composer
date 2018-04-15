import * as R from 'ramda';

/* A `DocPosition` represents a position in the document between two characters.
 * A `DocPosition` with offset n refers to the position between the nth and
 * (n-1)th character in the specified paragraph.
 */

const lenses = {
	paragraphID: R.lensProp('paragraphID'),
	offset: R.lensProp('offset'),
};

// make :: (ParagraphID, number) -> DocPosition
const make = (paragraphID, offset) => ({ paragraphID, offset });

function offsetBy(offset, position) {
	return R.over(lenses.offset, n => n + offset, position);
}

export {
	make,
	offsetBy,
};

