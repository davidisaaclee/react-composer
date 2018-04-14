import React from 'react';

import * as Doc from '../model/Doc';
import * as ParagraphUtils from '../model/Paragraph';
import * as Edit from '../model/Edit';
import * as Anchor from '../model/Anchor';
import * as DocSelection from '../model/DocSelection';

const k = {
	paragraphIDAttributeKey: 'data-paragraph-id'
};

const errorMessages = {
	couldNotFindParagraphIDForSelectionAnchor: anchorNode => `Could not find paragraph ID for selection anchor node: ${anchorNode}.`,
	couldNotFindParagraphIDForSelectionFocus: focusNode => `Could not find paragraph ID for selection focus node: ${focusNode}.`,
	selectNontextNode: selection => `Attempted selection on non-text nodes: ${selection}`,
};

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
		throw new Error(errorMessages.selectNontextNode(selection));
	}

	const anchorParagraphID = ancestorParagraphIDForNode(selection.anchorNode);
	const focusParagraphID = ancestorParagraphIDForNode(selection.focusNode);

	if (anchorParagraphID == null) {
		throw new Error(errorMessages.couldNotFindParagraphIDForSelectionAnchor(selection.anchorNode));
	}

	if (focusParagraphID == null) {
		throw new Error(errorMessages.couldNotFindParagraphIDForSelectionFocus(selection.focusNode));
	}

	// TODO: There should be a defined mapping between `Selection`'s offsets and model offsets.
	const anchor = Anchor.make(anchorParagraphID, selection.anchorOffset);
	const focus = Anchor.make(focusParagraphID, selection.focusOffset);
	return DocSelection.make(anchor, focus);
}

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

function getSelection() {
	// TODO: Cross-browser support
	return window.getSelection();
}


// document :: Doc
// onEdit :: RichText.Edit -> ()
const RichText = ({ document: doc, onEdit, ...restProps }) => {
	function handleKeyPress(evt) {
		onEdit(Edit.insertText(docSelectionFromNativeSelection(getSelection()), evt.key));
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
