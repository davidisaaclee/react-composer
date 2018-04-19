import * as R from 'ramda';

// OrderedDictionary k v ::= { all :: { k -> v }, order: [k] }

const lenses = {
	all: R.lensProp('all'),
	order: R.lensProp('order'),
};

export const empty = { all: {}, order: [] };


// fromArray :: [{ key :: k, value :: v }] -> OrderedDictionary k v
export const fromArray =
	array => array.reduce((dict, {key, value}, index) => insert(key, value, index, dict), empty);


// insert :: (k, v, number, OrderedDictionary k v) -> OrderedDictionary k v
const _insert = (key, value, index, dictionary) => ({
	all: { ...dictionary.all, [key]: value },
	order: index === -1 
		? [...dictionary.order, key]
		: [...dictionary.order.slice(0, index), key, ...dictionary.order.slice(index)]
});
export const insert = R.curry(_insert);


// TODO: Rename to `toValuesArray` for consistency
// toValuesList :: OrderedDictionary k v -> [v]
export const toValuesList = ({ all, order }) => order.map(key => all[key]);


// TODO: Rename to `toArray` for consistency
// toList :: OrderedDictionary k v -> [{ key: k, value: v }]
export const toList = ({ all, order }) => order.map(key => ({ key, value: all[key] }));


// keys :: OrderedDictionary k v -> [k]
export const keys = ({ order }) => order;


// toUnorderedObject :: OrderedDictionary k v -> { k -> v }
export const toUnorderedObject = ({ all }) => all;


// contains :: (k, OrderedDictionary k v) -> boolean
const _contains = (key, dict) => key in dict.all;
export const contains = R.curry(_contains);


// containsIndex :: (number, OrderedDictionary k v) -> boolean
const _containsIndex = (index, dict) => index >= 0 && index < count(dict);
export const containsIndex = R.curry(_containsIndex);


// set :: (k, v, OrderedDictionary k v) -> OrderedDictionary k v
const _set = (key, value, dict) => {
	if (!contains(key)(dict)) {
		return dict;
	}

	return {
		...dict,
		all: {
			...dict.all,
			[key]: value
		}, 
	};
};
export const set = R.curry(_set);


// push :: (k, v, OrderedDictionary k v) -> OrderedDictionary k v
const _push = (key, value, dict) => insert(key, value, count(dict), dict);
export const push = R.curry(_push);


// get :: (k, OrderedDictionary k v) -> v?
const _get = (key, dict) => dict.all[key];
export const get = R.curry(_get);


// nth :: (number, OrderedDictionary k v) -> v?
function _nth(index, dict) {
	const key = nthKey(index, dict);
	return key == null
		? null
		: get(key, dict);
}
export const nth = R.curry(_nth);


// indexOf :: (k, OrderedDictionary k v) -> number
// Returns -1 if key is not in dictionary.
const _indexOf = (key, dict) => R.pipe(
	R.view(lenses.order),
	R.indexOf(key)
)(dict);
export const indexOf = R.curry(_indexOf);


// update :: (k, (v -> v), OrderedDictionary k v) -> OrderedDictionary k v
const _update = (key, updater, dict) => {
	if (!contains(key, dict)) {
		return dict;
	}

	return set(key, updater(get(key, dict)), dict);
};
export const update = R.curry(_update);


// mapValues :: ((v -> v'), OrderedDictionary k v) -> OrderedDictionary k v'
const _mapValues = (transform, dict) =>
	dict.order.reduce(
		(acc, key) => update(key, transform, acc),
		dict);
export const mapValues = R.curry(_mapValues);


// filter :: ([k, v] -> Bool) -> OrderedDictionary k v -> OrderedDictionary k v
const _filter = (predicate, dict) =>
	dict.order
		.map((key, index) => ({ key, value: get(key, dict) }))
		.reduce((acc, entry) =>
			predicate([entry.key, entry.value]) 
			? push(entry, acc)
			: acc, empty);
export const filter = R.curry(_filter);


// remove :: (k, OrderedDictionary k v) -> OrderedDictionary k v
function _remove(key, dict) {
	if (!contains(key, dict)) {
		return dict;
	}

	return R.pipe(
		R.over(
			lenses.order,
			order => R.remove(R.indexOf(key, order), 1, order)),
		R.over(
			lenses.all,
			R.dissoc(key))
	)(dict);
}
export const remove = R.curry(_remove);


// keyAtIndex :: (number, OrderedDictionary k v) -> k?
const _keyAtIndex = (index, dict) => R.pipe(
	R.view(lenses.order),
	R.nth(index)
)(dict);
export const keyAtIndex = R.curry(_keyAtIndex);

// nthKey :: (number, OrderedDictionary k v) -> k?
// Alias for keyAtIndex.
export const nthKey = keyAtIndex;


// count :: OrderedDictionary k v -> number
export const count = R.pipe(R.view(lenses.order), R.length);


// slice :: (number, number, OrderedDictionary k v) -> OrderedDictionary k v
// Copies values between startIndex (inclusive) and endIndex (exclusive) into
// a new OrderedDictionary, and returns that dictionary.
function _slice(startIndex, endIndex, dict) {
	let sliced = empty;

	for (let index = startIndex; index < endIndex; index++) {
		const key = keyAtIndex(index, dict);
		const value = nth(index, dict);
		sliced = push(key, value, sliced);
	}

	return sliced;
}
export const slice = R.curry(_slice);


// merge :: (OrderedDictionary k v, OrderedDictionary k v) -> OrderedDictionary k v
// Creates a new dictionary by appending the contents of `d2` to `d1`.
function _merge(d1, d2) {
	return fromArray([...toList(d1), ...toList(d2)]);
}
export const merge = R.curry(_merge);


// mergeElements :: (number, number, MergeMethod, OrderedDictionary k v) -> OrderedDictionary k v
// where MergeMethod ::= ([{ key: k, value: v }]) -> { key: k, value: v }
// Merges a subsequence of the dictionary, using the supplied merge method.
//
//		const dict = fromArray([
//			{ key: 'a', value: 1 },
//			{ key: 'b', value: 2 },
//			{ key: 'c', value: 3 },
//		]);
//    const merged = mergeElements(
//      1,
//      1,
//      ([{ value }]) => ({
//        key: 'd',
//        value: value[0] + value[1]
//      }));
//    toList(merged) => [
//      { key: 'a', value: 1 },
//      { key: 'd', value: 5 },
//    ]
function _mergeElements(startIndex, count, mergeMethod, dict) {
	const elementsToMerge =
		toList(slice(startIndex, startIndex + count, dict));

	const mergedElement =
		mergeMethod(elementsToMerge);

	let newDict = dict;

	// Remove the elements to be merged from the dictionary.
	for (let index = startIndex; index < startIndex + count; index++) {
		const key = keyAtIndex(index, dict);
		newDict = remove(key, newDict);
	}

	// Insert the merged element.
	newDict =
		insert(
			mergedElement.key,
			mergedElement.value,
			startIndex,
			newDict);

	return newDict;
}
export const mergeElements = R.curry(_mergeElements);


