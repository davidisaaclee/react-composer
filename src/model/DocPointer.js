
/* A `DocPointer` points to a position in the document between two characters,
 * referenced by the containing paragraph's ID and the character offset within that paragraph.
 *
 * A `DocPointer` with offset n refers to the pointer between the nth and
 * (n-1)th character in the specified paragraph.
 */

// make :: (ParagraphID, number) -> DocPointer
const make = (paragraphID, offset) => ({ paragraphID, offset });

function offsetBy(offset, pointer) {
	return {
		...pointer,
		offset: offset + pointer.offset
	};
}

export {
	make,
	offsetBy,
};

