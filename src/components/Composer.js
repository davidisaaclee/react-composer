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
	queryingForParagraphWithoutEditorContainerRef: `Attempted to calculate DOM node and offset without editor container ref.`,
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
	let currentNode = node;

	while (currentNode.previousSibling != null) {
		currentNode = currentNode.previousSibling;
		characterOffset += currentNode.textContent.length;
	}

	if (currentNode.parentNode == null) {
		throw new Error('Attempted to find character offset for node not contained by paragraph node.');
	}
	
	if (isParagraphNode(currentNode.parentNode)) {
		return characterOffset;
	} else {
		return characterOffset + characterOffsetForNodeWithinParagraphNode(currentNode.parentNode);
	}
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

// textNodeAndOffsetFromPointer :: (Doc.Pointer, Node) -> { node: Node, offset: number }?
// Returns the text node and offset within that node for the specified pointer,
// searching from the specified root node.
function textNodeAndOffsetFromPointer(pointer, rootNode) {
	// textNodeAndOffsetForCharacterOffset :: (number, Node) -> { node: Node, offset: number }?
	function textNodeAndOffsetForCharacterOffset(offset, root) {
		let currentOffset = 0;
		for (let i = 0; i < root.childNodes.length; i++) {
			const child = root.childNodes[i];

			if (currentOffset + child.textContent.length < offset) {
				currentOffset += child.textContent.length;
				continue;
			} else {
				if (child.nodeType !== Node.TEXT_NODE) {
					// If the node containing the offset is not a text node,
					// "reset" the offset and find the text node and offset within that node.
					return textNodeAndOffsetForCharacterOffset(offset - currentOffset, child);
				}

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
		textNodeAndOffsetForCharacterOffset(
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
		suppressContentEditableWarning
		{...restProps}
	/>
);


// -- 

// document :: Doc
// selection :: (DocSelection Doc.Pointer)?
// onEdit :: Edit -> ()
// onSelectionChange :: (DocSelection Doc.Position) -> ()
// onAddLink :: (URL? -> ()) -> ()
// where URL ::= string
class Composer extends React.Component {
	constructor(props) {
		super(props);

		this.handleKeyPress =
			this.handleKeyPress.bind(this);
	}


	// -- Helpers

	reportSelection() {
		this.props.onSelectionChange(this.currentDocSelection);
	}

	// currentDocSelection :: DocSelection Doc.Pointer?
	// Returns the current selection as pointers into the document,
	// or null if the document is empty.
	// TODO: It would be nice to handle the case where nothing
	// is selected.
	get currentDocSelection() {
		if (Doc.count(this.props.document) === 0) {
			return null;
		}

		return docSelectionFromNativeSelection(getSelection());
	}


	// -- Events

	handleKeyPress(evt) {
		// editForCommand :: EditorCommand -> Edit?
		// Returns an `Edit` object based on the specified command,
		// or `null` if the command doesn't create an edit.
		const editForCommand = (command) => {
			switch (command.type) {
				case EditorCommand.types.text:
					return Edit.replaceText(
							this.currentDocSelection,
							command.text);

				case EditorCommand.types.paragraphBreak:
					return Edit.replaceTextWithParagraphBreak(
						this.currentDocSelection);

				case EditorCommand.types.bold:
					return Edit.toggleBold(
						this.currentDocSelection);

				case EditorCommand.types.italicize:
					return Edit.toggleItalic(
						this.currentDocSelection);

				case EditorCommand.types.backspace:
					return Edit.backspace(
						this.currentDocSelection);

				case EditorCommand.types.addLink:
					return null;

				default:
					console.error("Unrecognized command type", command.type);
					return null;
			}
		};

		// handleCommand :: EditorCommand -> ()
		// Performs any component-specific actions in response to the
		// specified command.
		const handleCommand = (command) => {
			switch (command.type) {
				case EditorCommand.types.addLink:
					const selection =
						this.currentDocSelection;

					const addLinkWithURL = (url) => {
						if (url == null) {
							return;
						}

						this.props.onEdit(Edit.addLink(selection, url));
					};

					this.props.onAddLink(addLinkWithURL);
					break;

				case EditorCommand.types.text:
				case EditorCommand.types.paragraphBreak:
				case EditorCommand.types.bold:
				case EditorCommand.types.italicize:
				case EditorCommand.types.backspace:
					break;

				default:
					console.error("Unrecognized command type", command.type);
					break;
			}
		};

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
			if (this.editorContainerRef == null) {
				throw new Error(errorMessages.queryingForParagraphWithoutEditorContainerRef);
			}

			const anchor =
				textNodeAndOffsetFromPointer(
					selection.anchor,
					this.editorContainerRef);
			const focus =
				textNodeAndOffsetFromPointer(
					selection.focus,
					this.editorContainerRef);

			windowSelection.setBaseAndExtent(
				anchor.node,
				anchor.offset,
				focus.node,
				focus.offset);
		}
	}


	// -- React.Component

	componentDidUpdate() {
		this.renderSelection(this.props.selection);
	}

	render() {
		const {
			document: doc, selection,
			onEdit, onSelectionChange, onAddLink,
			...restProps
		} = this.props;

		return (
			<EditorContainer
				innerRef={elm => this.editorContainerRef = elm}
				editable
				onKeyDown={this.handleKeyPress}
				onSelect={_ => {
					// If the document is empty, don't report selection; there isn't
					// a valid value of DocSelection that makes sense in this case.
					if (Doc.count(this.props.document) !== 0) {
						this.reportSelection();
					}
				}}
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

