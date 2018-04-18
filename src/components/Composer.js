import React from 'react';
import { compose } from 'ramda';

import * as EditorCommand from 'components/EditorCommand';
import Doc from 'model/Doc';
import ParagraphUtils from 'model/Paragraph';
import * as Edit from 'model/Edit';
import * as DocSelection from 'model/DocSelection';

const k = {
	paragraphIDAttributeKey: 'data-paragraph-id'
};

const errorMessages = {
	couldNotFindParagraphIDForSelectionAnchor: anchorNode => `Could not find paragraph ID for selection anchor node: ${anchorNode}.`,
	couldNotFindParagraphIDForSelectionFocus: focusNode => `Could not find paragraph ID for selection focus node: ${focusNode}.`,
	selectNontextNode: selection => `Attempted selection on non-text nodes: ${selection}`,
	queryingForParagraphBeforeReceivedRef: `Attempted to calculate DOM node and offset before receiving ref.`,
};


// -- Helper functions

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

// characterOffsetForNodeWithinParagraphNode :: Node -> number?
// Returns the character offset within the containing paragraph
// that the first character of the specified node would display.
function characterOffsetForNodeWithinParagraphNode(node) {
	let characterOffset = 0;
	let currentNode = node.previousSibling;
	while (currentNode != null) {
		characterOffset += currentNode.textContent.length;
		currentNode = currentNode.previousSibling;
	}

	return characterOffset;
}

// isParagraphNode :: Node -> boolean
function isParagraphNode(node) {
	return node.getAttribute(k.paragraphIDAttributeKey) != null;
}

// docSelectionFromNativeSelection :: Selection -> DocSelection Doc.Pointer
function docSelectionFromNativeSelection(selection) {
	// docPointerFromSelectionPoint :: (Node, number) -> Doc.Pointer
	function docPointerFromSelectionPoint(node, offset) {
		if (node.nodeType === Node.TEXT_NODE) {
			return {
				key: ancestorParagraphIDForNode(node),
				offset: characterOffsetForNodeWithinParagraphNode(node) + offset
			};
		} else if (isParagraphNode(node)) {
			return {
				key: node.getAttribute(k.paragraphIDAttributeKey),
				offset: 0
			};
		} else {
			throw new Error(errorMessages.selectNontextNode(selection));
		}
	}
	
	const anchorPointer =
		docPointerFromSelectionPoint(
			selection.anchorNode,
			selection.anchorOffset);
	const focusPointer =
		docPointerFromSelectionPoint(
			selection.focusNode,
			selection.focusOffset);

	return DocSelection.make(
		anchorPointer,
		focusPointer);
}

// queryParagraphNode :: (ParagraphID, Node) -> Node?
// Returns the text node displaying the specified paragraph, searching from
// the provided root node, or null if no such node could be found.
function queryParagraphNode(paragraphID, rootNode) {
	const selectorForParagraphID =
		`[${k.paragraphIDAttributeKey}="${paragraphID}"]`;
	return rootNode.querySelector(selectorForParagraphID);
}

// nodeAndOffsetFromPointer :: (Doc.Pointer, Node) -> { node: Node, offset: number }?
// Returns the text node and offset within that node for the specified pointer,
// searching from the specified root node.
function nodeAndOffsetFromPointer(pointer, rootNode) {
	// nodeAndOffsetForCharacterOffset :: (number, Node) -> { node: Node, offset: number }?
	function nodeAndOffsetForCharacterOffset(offset, root) {
		let currentOffset = 0;
		for (let i = 0; i < root.childNodes.length; i++) {
			const child = root.childNodes[i];
			if (child.nodeType !== Node.TEXT_NODE) {
				throw new Error("TODO: Deal with non-text nodes in paragraph node.");
			}

			if (currentOffset + child.textContent.length < offset) {
				currentOffset += child.textContent.length;
				continue;
			} else {
				return { node: child, offset: offset - currentOffset };
			}
		}

		return null;
	}

	const paragraphNode =
		queryParagraphNode(pointer.key, rootNode);

	if (paragraphNode == null) {
		return null;
	}

	const nodeAndOffset =
		nodeAndOffsetForCharacterOffset(
			pointer.offset,
			paragraphNode);

	if (nodeAndOffset == null) {
		throw new Error('Could not find text node');
	}

	const { node, offset } = nodeAndOffset;

	if (node == null) {
		// TODO: Uncertain what to do here.
		// One case that leads here is an empty <p> node.
		throw new Error(`No text node for paragraph ${pointer.key}`);
	}

	return { node, offset };
}


function getSelection() {
	// TODO: Cross-browser support
	return window.getSelection();
}


// -- Helper components

// Renders a paragraph as a <p> node with a data- attribute containing the paragraph ID.
const Paragraph = ({ paragraph, id, ...restProps }) => (
	<p
		{...{ [k.paragraphIDAttributeKey]: id }}
		{...restProps}
	>
		{ParagraphUtils.toList(paragraph).map(({ key, value }) => (
			<ParagraphContent key={key}>
				{value}
			</ParagraphContent>
		))}
	</p>
);

const ParagraphContent = ({ children, ...restProps }) => {
	const identity = x => x;

	let renderContent = identity;
	if (children.styles.link != null) {
		renderContent = compose(
			x => <a href={children.styles.link}>{x}</a>,
			renderContent);
	}
	if (children.styles.italic) {
		renderContent = compose(
			x => <em>{x}</em>,
			renderContent);
	}
	if (children.styles.bold) {
		renderContent = compose(
			x => <strong>{x}</strong>,
			renderContent);
	}

	return renderContent(children.text);
};

const EditorContainer = ({ editable = false, innerRef, ...restProps }) => (
	<div
		ref={innerRef}
		contentEditable={editable}
		{...restProps}
	/>
);


// -- 

// document :: Doc
// selection :: (DocSelection Doc.Pointer)?
// onEdit :: Edit -> ()
// onSelectionChange :: (DocSelection Doc.Position) -> ()
class Composer extends React.Component {
	constructor(props) {
		super(props);

		this.handleKeyPress = this.handleKeyPress.bind(this);
	}


	// -- Helpers
	// rangeFromSelection :: DocSelection Doc.Pointer -> Range
	rangeFromSelection(selection) {
		const pointerRange =
			Doc.pointerRangeFromSelection(selection, this.props.document);

		if (this.editorContainerRef == null) {
			throw new Error(errorMessages.queryingForParagraphBeforeReceivedRef);
		}

		const start =
			nodeAndOffsetFromPointer(
				pointerRange.start,
				this.editorContainerRef);
		const end =
			nodeAndOffsetFromPointer(
				pointerRange.end,
				this.editorContainerRef);

		const range = document.createRange();
		range.setStart(start.node, start.offset);
		range.setEnd(end.node, end.offset);
		return range;
	}


	// -- Events

	handleKeyPress(evt) {
		function editForCommand(command) {
			switch (command.type) {
				case EditorCommand.types.text:
					return Edit.replaceText(
							docSelectionFromNativeSelection(getSelection()),
							command.text);

				case EditorCommand.types.paragraphBreak:
					return Edit.replaceTextWithParagraphBreak(
						docSelectionFromNativeSelection(getSelection()));

				case EditorCommand.types.moveFocus:
					return null;

				default:
					console.error("Unrecognized command type", command.type);
					return null;
			}
		}

		const handleCommand = (command) => {
			switch (command.type) {
				case EditorCommand.types.text:
					return;

				case EditorCommand.types.paragraphBreak:
					return;

				case EditorCommand.types.moveFocus:
					const selection =
						docSelectionFromNativeSelection(getSelection());
					this.props.onSelectionChange(selection);
					return;

				default:
					console.error("Unrecognized command type", command.type);
					return null;
			}
		}

		const command =
			EditorCommand.fromKeyEvent(evt);

		if (command != null) {
			handleCommand(command);

			const edit = editForCommand(command);
			if (edit != null) {
				this.props.onEdit(edit);
				evt.preventDefault();
			}
		}
	}

	// renderSelection :: (DocSelection Doc.Pointer)? -> ()
	// Sets the browser's selection range to the specified document selection.
	// If a null selection is provided, clears the browser selection range.
	renderSelection(selection) {
		const windowSelection = getSelection();
		windowSelection.removeAllRanges();

		if (selection != null) {
			windowSelection.addRange(this.rangeFromSelection(selection));
		}
	}


	// -- React.Component

	componentDidUpdate() {
		this.renderSelection(this.props.selection);
	}

	render() {
		const {
			document: doc, selection,
			onEdit, onSelectionChange,
			...restProps
		} = this.props;

		return (
			<EditorContainer
				suppressContentEditableWarning
				innerRef={elm => this.editorContainerRef = elm}
				editable
				onKeyDown={this.handleKeyPress}
				{...restProps}
			>
				{Doc.toList(doc).map(({ key, value }) => (
					<Paragraph
						key={key}
						paragraph={value}
						id={key}
					/>
				))}
			</EditorContainer>
		);
	}
}

Composer.defaultProps = {
	selection: null,
	document: Doc.empty,
	onEdit: () => null,
	onSelectionChange: () => null,
};

export default Composer;

