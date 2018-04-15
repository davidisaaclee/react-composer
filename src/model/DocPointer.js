import * as R from 'ramda';

/* A `DocPointer` points to a position in the document between two characters,
 * referenced by the containing paragraph's ID and the character offset within that paragraph.
 *
 * A `DocPointer` with offset n refers to the pointer between the nth and
 * (n-1)th character in the specified paragraph.
 */

const lenses = {
	paragraphID: R.lensProp('paragraphID'),
	offset: R.lensProp('offset'),
};

// make :: (ParagraphID, number) -> DocPointer
const make = (paragraphID, offset) => ({ paragraphID, offset });

function offsetBy(offset, pointer) {
	return R.over(lenses.offset, n => n + offset, pointer);
}

export {
	make,
	offsetBy,
};

