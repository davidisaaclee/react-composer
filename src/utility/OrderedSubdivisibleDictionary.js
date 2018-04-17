import * as R from 'ramda';
import * as OD from './OrderedDictionary';

/*
`OrderedSubdivisbleDictionary` is a specialization of `OrderedDictionary`,
where the stored values are ordered collections. This module exposes methods
which operate across the dictionary's elements, as well as providing two
nested types - Pointer and Position - which can be used for indexing into a
subelement of the dictionary.

OrderedSubdivisbleDictionary k v ::= OrderedDictionary k v
	where v implements {
	  count: v -> number,
		containsIndex: (number, v) -> boolean,
	  slice: (number, number, v) -> v,
	  merge: (v, v) -> v
	}
*/

export default ({
	// count :: v -> number
	count: elementCount,

	// containsIndex :: (number, v) -> boolean
	containsIndex: elementContainsIndex,
	
	// slice :: (number, number, v) -> v
	slice: elementSlice,

	// merge :: (v, v) -> v
	merge: elementMerge
}) => {

	// Position ::= { index: number, offset: number };
	// Pointer ::= { key: k, offset: number };

	// makePosition :: (number, number) -> Position
	const makePosition = (index, offset) => ({ index, offset });

	// makePointer :: (k, number) -> Pointer
	const makePointer = (key, offset) => ({ key, offset });


	// positionFromPointer :: (Pointer, OSD) -> Position
	function _positionFromPointer(pointer, dict) {
		return makePosition(
			OD.indexOf(pointer.key, dict),
			pointer.offset);
	}
	const positionFromPointer = R.curry(_positionFromPointer);


	// pointerFromPosition :: (Position, OSD) -> Pointer
	function _pointerFromPosition(position, dict) {
		return makePointer(
			OD.keyAtIndex(position.index, dict),
			position.offset);
	}
	const pointerFromPosition = R.curry(_pointerFromPosition);


	// containsPosition :: (Position, OSD) -> boolean
	function _containsPosition(position, dict) {
		if (position.index == null) {
			return false;
		}

		const key = OD.keyAtIndex(position.index);
		if (key == null) {
			return false;
		}

		return elementContainsIndex(
			position.offset,
			OD.get(key, dict));
	}
	const containsPosition = R.curry(_containsPosition);


	// containsPointer :: (Pointer, OSD) -> boolean
	function _containsPointer(pointer, dict) {
		return containsPosition(
			positionFromPointer(pointer, dict),
			dict);
	}
	const containsPointer = R.curry(_containsPointer);


	// splitElement :: (Position, k, k, OSD k v) -> OSD k v
	// Splits the element at the specified position into two.
	// If the specified position is not in the dictionary,
	// returns the original dictionary.
	function _splitElement(splitPosition, beforeKey, afterKey, dict) {
		const splitKey =
			OD.keyAtIndex(
				splitPosition.index,
				dict);

		const before = elementSlice(
			0,
			splitPosition.offset,
			OD.get(splitKey, dict));

		const after = elementSlice(
			splitPosition.offset,
			elementCount(OD.get(splitKey, dict)),
			OD.get(splitKey, dict));

		return R.pipe(
			OD.remove(splitKey),
			// TODO: insert needs 4 args
			OD.insert(beforeKey, splitPosition.index),
			OD.insert(afterKey, splitPosition.index + 1),
		)(dict);
	}
	const splitElement = R.curry(_splitElement);


	// removeSlice :: (Position, Position, k, k, OSD k v) -> OSD k v
	function _removeSlice(startPosition, endPosition, beforeKey, afterKey, dict) {
		const startPositionKey =
			OD.keyAtIndex(startPosition.index, dict);
		const endPositionKey =
			OD.keyAtIndex(endPosition.index, dict);

		const before =
			elementSlice(
				0,
				startPosition.offset,
				OD.get(startPositionKey, dict));
		const after =
			elementSlice(
				endPosition.offset,
				elementCount(OD.get(endPositionKey, dict)),
				OD.get(endPositionKey, dict));
		const merged =
			elementMerge(before, after);

		return R.pipe(
			// Remove all full elements within the slice.
			d => R.reduce(
				(dict, key) => OD.remove(key, dict),
				d,
				R.map(
					index => OD.keyAtIndex(index, dict),
					R.range(startPosition.index + 1, endPosition.index))),
			OD.remove(startPositionKey),
			OD.remove(endPositionKey),
			OD.insert(startPositionKey, merged, startPosition.index),
		)(dict);
	}
	const removeSlice = R.curry(_removeSlice);


// sortPointersAscending :: ([Pointer], OSD) -> [Pointer]
	function _sortPointersAscending(pointers, dict) {
		return R.sortWith([
			R.ascend(pointer => OD.indexOf(pointer.key, dict)),
			R.ascend(pointer => pointer.offset)
		], pointers);
	}
	const sortPointersAscending = R.curry(_sortPointersAscending);


	return {
		...OD,
		makePosition,
		makePointer,
		positionFromPointer,
		pointerFromPosition,
		containsPosition,
		containsPointer,
		splitElement,
		removeSlice,
		sortPointersAscending,
	};
};


