import React from 'react';
import * as R from 'ramda';
import * as Doc from './Doc';
import * as ParagraphUtils from './Paragraph';

const errorMessages = {
	couldNotFindParagraphIDForSelectionAnchor: anchorNode => `Could not find paragraph ID for selection anchor node: ${anchorNode}.`,
	couldNotFindParagraphIDForSelectionFocus: focusNode => `Could not find paragraph ID for selection focus node: ${focusNode}.`
};

const k = {
	paragraphIDAttributeKey: 'data-paragraph-id'
};

const Anchor = {
	// make :: (ParagraphID, number) -> Anchor
	make: (paragraphID, offset) => ({ paragraphID, offset })
};

const DocSelection = {
	// make :: (Anchor, Anchor) -> DocSelection
	// anchor - where the selection action began
	// focus - where the selection action ended
	make: (anchor, focus) => ({ anchor, focus }),
};

export const Edit = {
	types: {
		// Either inserting text at a caret (empty `selection`),
		// or replacing a selection of text with new text.
		insertText: 'insertText'
	},

	// insertText :: (DocSelection, string) -> Edit
	insertText: (selection, text) => ({
		type: Edit.types.insertText,
		selection,
		text
	}),
};

const Paragraph = ({ paragraph, id, ...restProps }) => (
	<p
		{...{ [k.paragraphIDAttributeKey]: id }}
		{...restProps}
	>
		{ParagraphUtils.content(paragraph)}
	</p>
);

const EditorContainer = ({ editable = false, ...restProps }) => (
	<div
		contentEditable={editable}
		{...restProps}
	/>
);

// ancestorParagraphIDForNode :: Node? -> ParagraphID?
function ancestorParagraphIDForNode(node) {
	if (node == null) {
		return null;
	} else if (!(node instanceof Element)) {
		return ancestorParagraphIDForNode(node.parentNode);
	} else {
		const paragraphID = node.getAttribute(k.paragraphIDAttributeKey);
		if (paragraphID == null) {
			return ancestorParagraphIDForNode(node.parentNode);
		} else {
			return paragraphID;
		}
	}
}

// docSelectionFromNativeSelection :: Selection -> DocSelection
function docSelectionFromNativeSelection(selection) {
	if (selection.anchorNode.nodeType !== Node.TEXT_NODE || selection.focusNode.nodeType !== Node.TEXT_NODE) {
		// TODO
		throw new Error("Attempted selection on non-text nodes.");
	}

	const anchorParagraphID = ancestorParagraphIDForNode(selection.anchorNode);
	const focusParagraphID = ancestorParagraphIDForNode(selection.focusNode);

	if (anchorParagraphID == null) {
		throw new Error(errorMessages.couldNotFindParagraphIDForSelectionAnchor(selection.anchorNode));
	}

	// TODO: I think this shouldn't throw? What happens when no selection range?
	if (focusParagraphID == null) {
		throw new Error(errorMessages.couldNotFindParagraphIDForSelectionFocus(selection.focusNode));
	}

	// TODO: There should be a defined mapping between `Selection`'s offsets and model offsets.
	const anchor = Anchor.make(anchorParagraphID, selection.anchorOffset);
	const focus = Anchor.make(focusParagraphID, selection.focusOffset);
	return DocSelection.make(anchor, focus);
}


// document :: Doc
// onEdit :: RichText.Edit -> ()
const RichText = ({ document: doc, onEdit, ...restProps }) => {
	function handleKeyPress(evt) {
		onEdit(Edit.insertText(docSelectionFromNativeSelection(window.getSelection()), evt.key));
	}

	return (
		<EditorContainer
			editable
			onKeyPress={handleKeyPress}
			{...restProps}
		>
			{Doc.paragraphList(doc).map(({ id, paragraph }) => (
				<Paragraph
					key={id}
					paragraph={paragraph}
					id={id}
				/>
			))}
		</EditorContainer>
	);
};

export default RichText;

