import { useEditor, EditorContent, Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, Extension } from '@tiptap/react'
import { Check } from 'lucide-react'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { TextSelection, Plugin, PluginKey } from '@tiptap/pm/state'
import FontFamily from '@tiptap/extension-font-family'
import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { saleContractTemplateHTML } from '../../templates/saleContract'
import EditorToolbar from './EditorToolbar'
import './editor.css'

// Custom FontSize Extension
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        }
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {}
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            }
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run()
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run()
            },
        }
    },
})

const DataField = Node.create({
    name: 'dataField',
    group: 'inline',
    inline: true,
    content: 'text*',

    addAttributes() {
        return {
            fieldId: {
                default: null,
                parseHTML: element => element.getAttribute('data-field-id'),
                renderHTML: attributes => {
                    return {
                        'data-field-id': attributes.fieldId,
                    }
                },
            },
            source: {
                default: null,
                parseHTML: element => element.getAttribute('data-source'),
                renderHTML: attributes => {
                    return {
                        'data-source': attributes.source,
                    }
                },
            },
            disabled: {
                default: false,
                parseHTML: element => element.getAttribute('data-disabled') === 'true',
                renderHTML: attributes => {
                    return {
                        'data-disabled': attributes.disabled,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            { tag: 'span[data-field-id]' },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        const disabled = HTMLAttributes.disabled === true || HTMLAttributes.disabled === 'true';
        return ['span', mergeAttributes(HTMLAttributes, {
            class: `data-field ${disabled ? 'disabled' : ''}`,
            'data-disabled': disabled
        }), 0]
    },

    // Prevent node deletion - restore placeholder when field would become empty
    addKeyboardShortcuts() {
        const handleDelete = (editor: any, key: string) => { // Added key param
            const { state } = editor
            const { selection } = state
            const { from, to } = selection
            const $from = selection.$from

            // 0. Boundary Checks: If at start/end of field, let browser handle (delete outside)
            if (selection.empty) {
                // If Backspace at start of field (offset 0), we are deleting the char BEFORE the field.
                // We should NOT trap this.
                if (key === 'Backspace' && $from.parentOffset === 0) {
                    return false
                }
                // If Delete at end of field, we are deleting the char AFTER the field.
                if (key === 'Delete' && $from.parent.type.name === 'dataField' && $from.parentOffset === $from.parent.content.size) {
                    return false
                }
            }

            // 1. Check if selection fully covers a dataField (e.g. NodeSelection or full TextSelection)
            let coveredNode: any = null
            let coveredPos: number | null = null

            state.doc.nodesBetween(from, to, (node: any, pos: number) => {
                if (coveredNode) return false
                if (node.type.name === 'dataField') {
                    // Check if fully covered (allow for small margin of error in selection or exact match)
                    if (pos >= from && pos + node.nodeSize <= to) {
                        coveredNode = node
                        coveredPos = pos
                    }
                }
            })

            if (coveredNode && coveredPos !== null) {
                const fieldId = coveredNode.attrs.fieldId
                const placeholder = `[${fieldId}]`
                const targetPos = coveredPos as number // Fix TS error

                // If fully selected, restore placeholder
                editor.chain()
                    .command(({ tr }: any) => {
                        tr.replaceWith(targetPos + 1, targetPos + coveredNode.nodeSize - 1, state.schema.text(placeholder))
                        tr.setNodeMarkup(targetPos, undefined, { ...coveredNode.attrs, source: null })
                        return true
                    })
                    .setTextSelection({ from: targetPos + 1, to: targetPos + 1 + placeholder.length })
                    .run()
                return true
            }

            // 2. Check if cursor is inside a dataField (Original Logic)
            for (let d = $from.depth; d > 0; d--) {
                const node = $from.node(d)
                if (node.type.name === 'dataField') {
                    const text = node.textContent
                    const fieldId = node.attrs.fieldId
                    const placeholder = `[${fieldId}]`
                    const pos = $from.before(d)

                    // Already placeholder - prevent any deletion
                    if (text === placeholder) {
                        // Ensure it is selected so next type overwrites it
                        if (selection.empty) {
                            editor.commands.setTextSelection({ from: pos + 1, to: pos + 1 + placeholder.length })
                        }
                        return true
                    }

                    // Calculate remaining length after delete
                    let remainingLength: number
                    if (!selection.empty) {
                        // Selection delete
                        const nodeStart = pos + 1
                        const nodeEnd = nodeStart + text.length
                        const selStart = Math.max(selection.from, nodeStart)
                        const selEnd = Math.min(selection.to, nodeEnd)
                        remainingLength = text.length - (selEnd - selStart)
                    } else {
                        // Single char delete
                        remainingLength = text.length - 1
                    }

                    // If would become empty, restore placeholder instead
                    if (remainingLength <= 0) {
                        editor.chain()
                            .command(({ tr }: any) => {
                                tr.replaceWith(pos + 1, pos + node.nodeSize - 1, state.schema.text(placeholder))
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, source: null })
                                return true
                            })
                            .setTextSelection({ from: pos + 1, to: pos + 1 + placeholder.length })
                            .run()
                        return true
                    }
                    break
                }
            }
            return false
        }

        return {
            'Backspace': ({ editor }) => handleDelete(editor, 'Backspace'),
            'Delete': ({ editor }) => handleDelete(editor, 'Delete'),
        }
    },

    addNodeView() {
        return ReactNodeViewRenderer(({ node, getPos, editor }) => {
            const fieldId = node.attrs.fieldId;
            const source = node.attrs.source;
            const textContent = node.textContent;

            // Always show placeholder format
            const displayText = `[${fieldId}]`;
            const isPlaceholder = textContent === displayText;

            const disabled = node.attrs.disabled === true || node.attrs.disabled === 'true';

            let bgClass = '';
            if (disabled) {
                bgClass = 'bg-gray-100 border border-gray-200 text-gray-400 px-1 rounded cursor-not-allowed pointer-events-none opacity-60';
            } else if (source === 'agent') {
                bgClass = 'bg-yellow-50 border border-yellow-200 text-gray-900 px-1 rounded';
            } else if (source === 'mapped') {
                bgClass = 'bg-green-50 border border-green-200 text-green-900 px-1 rounded';
            } else if (source === 'user') {
                // [CHANGED] User input should be black text, but keep blue bg/border to indicate status
                bgClass = 'bg-blue-50 border border-blue-200 text-gray-900 px-1 rounded';
            } else if (source === 'auto') {
                // [ADDED] Auto-filled N/A should look like plain text
                bgClass = 'bg-transparent text-gray-900 px-0';
            } else {
                // Default: show placeholder text always
                bgClass = 'bg-gray-50 border border-gray-300 text-gray-600 px-1 rounded';
            }

            const handleClick = () => {
                if (isPlaceholder && typeof getPos === 'function') {
                    const pos = getPos();
                    if (typeof pos === 'number') {
                        editor.commands.setTextSelection({
                            from: pos + 1,
                            to: pos + node.nodeSize - 1
                        });
                    }
                }
            };

            return (
                <NodeViewWrapper
                    as="span"
                    className={`data-field-node ${bgClass} transition-colors duration-200`}
                    onClick={handleClick}
                    style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                    {/* Always show the text content */}
                    {/* @ts-ignore */}
                    <NodeViewContent as="span" />
                </NodeViewWrapper>
            )
        })
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('dataFieldProtection'),
                appendTransaction: (transactions, oldState, newState) => {
                    // Check if any transaction modified the document
                    const docChanged = transactions.some(tr => tr.docChanged)
                    if (!docChanged) return null

                    const tr = newState.tr
                    let modified = false

                    newState.doc.descendants((node, pos) => {
                        if (node.type.name === 'dataField' && node.content.size === 0) {
                            const fieldId = node.attrs.fieldId
                            const placeholder = `[${fieldId}]`

                            // [FIX] Map position to account for previous changes in this transaction
                            const mappedPos = tr.mapping.map(pos)

                            // Restore placeholder
                            tr.insertText(placeholder, mappedPos + 1)
                            tr.setNodeMarkup(mappedPos, undefined, { ...node.attrs, source: null })

                            // Force cursor inside and SELECT the placeholder so typing overwrites it
                            const sel = newState.selection
                            // Check if selection is near the node (inside or at boundaries)
                            // Note: We use original pos for selection check against newState, but mappedPos for setting selection
                            if (sel.head >= pos && sel.head <= pos + 1) {
                                tr.setSelection(TextSelection.create(tr.doc, mappedPos + 1, mappedPos + 1 + placeholder.length))
                            }

                            modified = true
                        }
                    })

                    return modified ? tr : null
                }
            }),
            new Plugin({
                key: new PluginKey('userInputDetector'),
                appendTransaction: (transactions, oldState, newState) => {
                    // Check if any transaction modified the document
                    const docChanged = transactions.some(tr => tr.docChanged)
                    if (!docChanged) return null

                    const tr = newState.tr
                    let modified = false

                    // Compare old and new state to detect user modifications
                    newState.doc.descendants((newNode, pos) => {
                        if (newNode.type.name === 'dataField' && newNode.attrs.source === null) {
                            const fieldId = newNode.attrs.fieldId
                            const placeholder = `[${fieldId}]`
                            const currentText = newNode.textContent

                            // If text is not the placeholder, user has modified it
                            if (currentText !== placeholder && currentText.trim() !== '') {
                                // Change source to 'user' to show blue highlighting
                                tr.setNodeMarkup(pos, undefined, { ...newNode.attrs, source: 'user' })
                                modified = true
                            }
                        }
                    })

                    return modified ? tr : null
                }
            })
        ]
    },
})

// Sync flag to prevent recursive updates
let isSyncing = false

const Div = Node.create({
    name: 'div',
    group: 'block',
    content: 'block+',
    addAttributes() {
        return {
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => {
                    if (!attributes.class) {
                        return {}
                    }
                    return { class: attributes.class }
                },
            },
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
                renderHTML: attributes => {
                    if (!attributes.style) {
                        return {}
                    }
                    return { style: attributes.style }
                },
            },
        }
    },
    parseHTML() {
        return [
            { tag: 'div' },
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes), 0]
    },
})

// Row Deletion Detector Extension
const createRowDeletionDetector = (onRowDeleted?: (fieldIds: string[]) => void) => {
    return Extension.create({
        name: 'rowDeletionDetector',

        addProseMirrorPlugins() {
            return [
                new Plugin({
                    key: new PluginKey('rowDeletionDetector'),
                    appendTransaction: (transactions, oldState, newState) => {
                        if (!onRowDeleted) return null

                        // Check if any transaction modified the document
                        const docChanged = transactions.some(tr => tr.docChanged)
                        if (!docChanged) return null

                        // Count rows and collect field IDs in old and new state
                        const oldRows: Array<{ fieldIds: string[] }> = []
                        const newRows: Array<{ fieldIds: string[] }> = []

                        // Collect rows from old state
                        oldState.doc.descendants((node) => {
                            if (node.type.name === 'tableRow') {
                                const fieldIds: string[] = []
                                node.descendants((childNode) => {
                                    if (childNode.type.name === 'dataField') {
                                        const fieldId = childNode.attrs.fieldId
                                        // [FIX] Ignore 'currency' as it is shared across all rows and breaks uniqueness checks
                                        if (fieldId && fieldId !== 'currency') {
                                            fieldIds.push(fieldId)
                                        }
                                    }
                                })
                                if (fieldIds.length > 0) {
                                    oldRows.push({ fieldIds })
                                }
                            }
                        })

                        // Collect rows from new state
                        newState.doc.descendants((node) => {
                            if (node.type.name === 'tableRow') {
                                const fieldIds: string[] = []
                                node.descendants((childNode) => {
                                    if (childNode.type.name === 'dataField') {
                                        const fieldId = childNode.attrs.fieldId
                                        // [FIX] Ignore 'currency' as it is shared across all rows and breaks uniqueness checks
                                        if (fieldId && fieldId !== 'currency') {
                                            fieldIds.push(fieldId)
                                        }
                                    }
                                })
                                if (fieldIds.length > 0) {
                                    newRows.push({ fieldIds })
                                }
                            }
                        })

                        // console.log(`📊 [RowDetector] Old Rows: ${oldRows.length}, New Rows: ${newRows.length}`)

                        // Only proceed if row count decreased (deletion)
                        if (newRows.length >= oldRows.length) {
                            return null
                        }



                        // Find which rows were deleted by comparing field IDs
                        const deletedFieldIds: string[] = []
                        for (const oldRow of oldRows) {
                            // Check if this row exists in new state
                            const rowExists = newRows.some(newRow => {
                                // Row exists if it has at least one matching field ID
                                return newRow.fieldIds.some(newId => oldRow.fieldIds.includes(newId))
                            })

                            if (!rowExists) {
                                // Row was deleted
                                deletedFieldIds.push(...oldRow.fieldIds)
                            }
                        }

                        if (deletedFieldIds.length > 0) {
                            // Call callback asynchronously to avoid transaction conflicts
                            setTimeout(() => {
                                onRowDeleted(deletedFieldIds)
                            }, 0)
                        }

                        return null
                    }
                })
            ]
        }
    })
}

// Auto Calculation Extension for totals
const AutoCalculation = Extension.create({
    name: 'autoCalculation',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('autoCalculation'),
                appendTransaction: (transactions, oldState, newState) => {
                    // Check if any transaction modified the document
                    const docChanged = transactions.some(tr => tr.docChanged)
                    if (!docChanged) return null

                    const tr = newState.tr
                    let modified = false

                    // Store row data: suffix -> { quantity, unitPrice, subTotalNode, subTotalPos }
                    const rowData = new Map<string, {
                        quantity: number,
                        unitPrice: number,
                        subTotalNode: any,
                        subTotalPos: number,
                        eaBox: number,
                        box: number,
                        netWeight: number,
                        grossWeight: number,
                        measurement: number
                    }>()

                    // Store total fields
                    let totalQuantityPos: number | null = null
                    let totalPricePos: number | null = null
                    let totalEaBoxPos: number | null = null
                    let totalBoxPos: number | null = null
                    let totalNetWeightPos: number | null = null
                    let totalGrossWeightPos: number | null = null
                    let totalMeasurementPos: number | null = null

                    let totalQuantityNode: any = null
                    let totalPriceNode: any = null
                    let totalEaBoxNode: any = null
                    let totalBoxNode: any = null
                    let totalNetWeightNode: any = null
                    let totalGrossWeightNode: any = null
                    let totalMeasurementNode: any = null

                    // First pass: Collect all relevant nodes
                    newState.doc.descendants((node, pos) => {
                        if (node.type.name === 'dataField') {
                            const fieldId = node.attrs.fieldId
                            const text = node.textContent

                            // Check for Total fields
                            if (fieldId === 'total_quantity') {
                                totalQuantityPos = pos
                                totalQuantityNode = node
                                return
                            }
                            if (fieldId === 'total_price') {
                                totalPricePos = pos
                                totalPriceNode = node
                                return
                            }
                            if (fieldId === 'total_ea/box') {
                                totalEaBoxPos = pos
                                totalEaBoxNode = node
                                return
                            }
                            if (fieldId === 'total_box') {
                                totalBoxPos = pos
                                totalBoxNode = node
                                return
                            }
                            if (fieldId === 'total_net_weight') {
                                totalNetWeightPos = pos
                                totalNetWeightNode = node
                                return
                            }
                            if (fieldId === 'total_gross_weight') {
                                totalGrossWeightPos = pos
                                totalGrossWeightNode = node
                                return
                            }
                            if (fieldId === 'total_measurement') {
                                totalMeasurementPos = pos
                                totalMeasurementNode = node
                                return
                            }

                            // Check for Row fields
                            // Match quantity(_suffix), unit_price(_suffix), sub_total_price(_suffix), ea_box(_suffix), box(_suffix)
                            // Also match net_weight(_suffix), gross_weight(_suffix), measurement(_suffix)
                            const quantityMatch = fieldId.match(/^quantity(_\d+)?$/)
                            const unitPriceMatch = fieldId.match(/^unit_price(_\d+)?$/)
                            const subTotalMatch = fieldId.match(/^sub_total_price(_\d+)?$/)
                            const eaBoxMatch = fieldId.match(/^ea_box(_\d+)?$/)
                            const boxMatch = fieldId.match(/^box(_\d+)?$/)
                            const netWeightMatch = fieldId.match(/^net_weight(_\d+)?$/)
                            const grossWeightMatch = fieldId.match(/^gross_weight(_\d+)?$/)
                            const measurementMatch = fieldId.match(/^measurement(_\d+)?$/)

                            if (quantityMatch || unitPriceMatch || subTotalMatch || eaBoxMatch || boxMatch || netWeightMatch || grossWeightMatch || measurementMatch) {
                                const suffix = (quantityMatch?.[1] || unitPriceMatch?.[1] || subTotalMatch?.[1] || eaBoxMatch?.[1] || boxMatch?.[1] || netWeightMatch?.[1] || grossWeightMatch?.[1] || measurementMatch?.[1]) || ''

                                if (!rowData.has(suffix)) {
                                    rowData.set(suffix, { quantity: 0, unitPrice: 0, subTotalNode: null, subTotalPos: -1, eaBox: 0, box: 0, netWeight: 0, grossWeight: 0, measurement: 0 })
                                }
                                const data = rowData.get(suffix)!

                                const value = parseFloat(text.replace(/[^\d.-]/g, ''))

                                if (quantityMatch) {
                                    if (!isNaN(value)) data.quantity = value
                                } else if (unitPriceMatch) {
                                    if (!isNaN(value)) data.unitPrice = value
                                } else if (subTotalMatch) {
                                    data.subTotalNode = node
                                    data.subTotalPos = pos
                                } else if (eaBoxMatch) {
                                    if (!isNaN(value)) data.eaBox = value
                                } else if (boxMatch) {
                                    if (!isNaN(value)) data.box = value
                                } else if (netWeightMatch) {
                                    if (!isNaN(value)) data.netWeight = value
                                } else if (grossWeightMatch) {
                                    if (!isNaN(value)) data.grossWeight = value
                                } else if (measurementMatch) {
                                    if (!isNaN(value)) data.measurement = value
                                }
                            }
                        }
                    })

                    // Calculate updates
                    const updates: { pos: number, node: any, newText: string }[] = []
                    let grandTotalQuantity = 0
                    let grandTotalPrice = 0
                    let grandTotalEaBox = 0
                    let grandTotalBox = 0
                    let grandTotalNetWeight = 0
                    let grandTotalGrossWeight = 0
                    let grandTotalMeasurement = 0

                    // Process each row
                    for (const [suffix, data] of rowData) {
                        // Calculate sub_total
                        const subTotal = data.quantity * data.unitPrice

                        // Add to grand totals
                        grandTotalQuantity += data.quantity
                        grandTotalPrice += subTotal
                        grandTotalEaBox += data.eaBox || 0
                        grandTotalBox += data.box || 0
                        grandTotalNetWeight += data.netWeight || 0
                        grandTotalGrossWeight += data.grossWeight || 0
                        grandTotalMeasurement += data.measurement || 0

                        // Update sub_total_price field if it exists
                        if (data.subTotalNode && data.subTotalPos !== -1) {
                            // Format to 2 decimal places
                            const newText = subTotal.toFixed(2)
                            const currentText = data.subTotalNode.textContent

                            // Only update if changed and not a placeholder (unless value is 0, then we might want to show 0.00)
                            // But if it's a placeholder [sub_total_price], we should definitely update it if we have a value
                            if (currentText !== newText) {
                                updates.push({ pos: data.subTotalPos, node: data.subTotalNode, newText })
                            }
                        }
                    }

                    // Update total_quantity
                    if (totalQuantityPos !== null && totalQuantityNode) {
                        const newText = grandTotalQuantity.toString()
                        const currentText = totalQuantityNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalQuantityPos, node: totalQuantityNode, newText })
                        }
                    }

                    // Update total_price
                    if (totalPricePos !== null && totalPriceNode) {
                        const newText = grandTotalPrice.toFixed(2)
                        const currentText = totalPriceNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalPricePos, node: totalPriceNode, newText })
                        }
                    }

                    // Update total_ea/box
                    if (totalEaBoxPos !== null && totalEaBoxNode) {
                        const newText = grandTotalEaBox.toString()
                        const currentText = totalEaBoxNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalEaBoxPos, node: totalEaBoxNode, newText })
                        }
                    }

                    // Update total_box
                    if (totalBoxPos !== null && totalBoxNode) {
                        const newText = grandTotalBox.toString()
                        const currentText = totalBoxNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalBoxPos, node: totalBoxNode, newText })
                        }
                    }

                    // Update total_net_weight
                    if (totalNetWeightPos !== null && totalNetWeightNode) {
                        const newText = grandTotalNetWeight.toFixed(2) + " KG"
                        const currentText = totalNetWeightNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalNetWeightPos, node: totalNetWeightNode, newText })
                        }
                    }

                    // Update total_gross_weight
                    if (totalGrossWeightPos !== null && totalGrossWeightNode) {
                        const newText = grandTotalGrossWeight.toFixed(2) + " KG"
                        const currentText = totalGrossWeightNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalGrossWeightPos, node: totalGrossWeightNode, newText })
                        }
                    }

                    // Update total_measurement
                    if (totalMeasurementPos !== null && totalMeasurementNode) {
                        const newText = grandTotalMeasurement.toFixed(3) + " CBM"
                        const currentText = totalMeasurementNode.textContent
                        if (currentText !== newText) {
                            updates.push({ pos: totalMeasurementPos, node: totalMeasurementNode, newText })
                        }
                    }

                    // Apply updates in reverse order to avoid position shifts
                    if (updates.length > 0) {
                        updates.sort((a, b) => b.pos - a.pos)

                        for (const update of updates) {
                            const newNode = newState.schema.nodes.dataField.create(
                                update.node.attrs,
                                newState.schema.text(update.newText)
                            )
                            tr.replaceWith(update.pos, update.pos + update.node.nodeSize, newNode)
                            modified = true
                        }
                    }

                    return modified ? tr : null
                }
            })
        ]
    }
})

const Checkbox = Node.create({
    name: 'checkbox',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            checked: {
                default: false,
                parseHTML: element => element.getAttribute('data-checked') === 'true',
                renderHTML: attributes => {
                    return {
                        'data-checked': attributes.checked,
                    }
                },
            },
            group: {
                default: null,
                parseHTML: element => element.getAttribute('data-group'),
                renderHTML: attributes => {
                    return {
                        'data-group': attributes.group,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span.checkbox-widget',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { class: 'checkbox-widget' }), '']
    },

    addNodeView() {
        return ReactNodeViewRenderer(({ node, updateAttributes, editor, getPos }) => {
            return (
                <NodeViewWrapper as="span" className="checkbox-wrapper inline-block align-middle mx-1">
                    <span
                        className={`checkbox-widget inline-flex items-center justify-center w-5 h-5 transition-all cursor-pointer select-none rounded bg-gray-50 border border-gray-300 ${node.attrs.checked ? 'text-black' : 'text-transparent'
                            }`}
                        onClick={() => {
                            const clickedPos = getPos();
                            if (typeof clickedPos !== 'number') return;

                            // [FIX] Use setTimeout to ensure we are out of the render cycle
                            setTimeout(() => {
                                const isChecked = !node.attrs.checked;

                                editor.chain()
                                    .command(({ tr }) => {
                                        // 1. Update SELF
                                        tr.setNodeMarkup(clickedPos, undefined, { ...node.attrs, checked: isChecked });

                                        // 2. If checking self, uncheck OTHERS in group
                                        if (isChecked && node.attrs.group) {
                                            editor.state.doc.descendants((descendant: any, pos: number) => {
                                                if (descendant.type.name === 'checkbox' &&
                                                    descendant.attrs.group === node.attrs.group &&
                                                    descendant.attrs.checked &&
                                                    pos !== clickedPos) {
                                                    tr.setNodeMarkup(pos, undefined, { ...descendant.attrs, checked: false });
                                                }
                                                return true;
                                            });
                                        }
                                        return true;
                                    })
                                    .run();
                            }, 0);
                        }}
                        style={{ verticalAlign: 'text-bottom' }}
                    >
                        {node.attrs.checked && <Check size={16} strokeWidth={3} />}
                    </span>
                </NodeViewWrapper >
            )
        })
    },
})

const Radio = Node.create({
    name: 'radio',
    group: 'inline',
    inline: true,
    atom: true,

    addAttributes() {
        return {
            checked: {
                default: false,
                parseHTML: element => element.classList.contains('checked') || element.getAttribute('data-checked') === 'true',
                renderHTML: attributes => {
                    return {
                        class: `radio-circle ${attributes.checked ? 'checked' : ''}`,
                        'data-checked': attributes.checked,
                    }
                },
            },
            group: {
                default: null,
                parseHTML: element => element.getAttribute('data-group'),
                renderHTML: attributes => {
                    return {
                        'data-group': attributes.group,
                    }
                },
            },
            linkedField: {
                default: null,
                parseHTML: element => element.getAttribute('data-linked-field'),
                renderHTML: attributes => {
                    return {
                        'data-linked-field': attributes.linkedField,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span.radio-circle',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { class: `radio-circle ${HTMLAttributes.checked ? 'checked' : ''}` })]
    },

    addNodeView() {
        return ReactNodeViewRenderer(({ node, updateAttributes, editor, getPos }) => {
            return (
                <NodeViewWrapper as="span" className="radio-wrapper inline-block align-middle mx-1">
                    <span
                        className={`radio-circle inline-flex items-center justify-center w-5 h-5 rounded-full border transition-all cursor-pointer select-none ${node.attrs.checked
                            ? 'border-black bg-white shadow-sm'
                            : 'bg-white border-gray-300 hover:border-gray-900 shadow-sm'
                            }`}
                        onClick={() => {
                            const clickedPos = getPos();
                            if (typeof clickedPos !== 'number') return;

                            // [FIX] Use setTimeout to ensure we are out of the render cycle
                            setTimeout(() => {
                                const isChecked = !node.attrs.checked;

                                editor.chain()
                                    .command(({ tr }) => {
                                        // 1. Update clicked radio state
                                        tr.setNodeMarkup(clickedPos, undefined, { ...node.attrs, checked: isChecked });

                                        // 2. Handle linked field enabling/disabling for THIS radio
                                        const linkedFieldId = node.attrs.linkedField;
                                        if (linkedFieldId) {
                                            editor.state.doc.descendants((descendant: any, pos: number) => {
                                                if (descendant.type.name === 'dataField' && descendant.attrs.fieldId === linkedFieldId) {
                                                    tr.setNodeMarkup(pos, undefined, { ...descendant.attrs, disabled: !isChecked });
                                                }
                                                return true;
                                            });
                                        }

                                        // 3. If checking this radio, uncheck others in group and disable their fields
                                        if (isChecked && node.attrs.group) {
                                            editor.state.doc.descendants((descendant: any, pos: number) => {
                                                if (descendant.type.name === 'radio' &&
                                                    descendant.attrs.group === node.attrs.group &&
                                                    descendant.attrs.checked &&
                                                    pos !== clickedPos) {
                                                    // Uncheck other radio
                                                    tr.setNodeMarkup(pos, undefined, { ...descendant.attrs, checked: false });

                                                    // Disable its linked field
                                                    const otherLinkedFieldId = descendant.attrs.linkedField;
                                                    if (otherLinkedFieldId) {
                                                        editor.state.doc.descendants((fieldDescendant: any, fieldPos: number) => {
                                                            if (fieldDescendant.type.name === 'dataField' && fieldDescendant.attrs.fieldId === otherLinkedFieldId) {
                                                                tr.setNodeMarkup(fieldPos, undefined, { ...fieldDescendant.attrs, disabled: true });
                                                            }
                                                            return true;
                                                        });
                                                    }
                                                }
                                                return true;
                                            });
                                        }
                                        return true;
                                    })
                                    .run();
                            }, 0);
                        }}
                        style={{ verticalAlign: 'text-bottom' }}
                    >
                        {node.attrs.checked && <span className="w-2.5 h-2.5 rounded-full bg-black" />}
                    </span>
                </NodeViewWrapper>
            )
        })
    },
})

export interface FieldChange {
    fieldId: string
    value: string
}

export interface ContractEditorRef {
    getContent: () => string
    getJSON: () => object
    setContent: (content: string) => void
    insertContent: (content: string) => void
    replaceSelection: (content: string) => void
    applyFieldChanges: (changes: FieldChange[]) => void
}

interface ContractEditorProps {
    initialContent?: string
    onChange?: (content: string) => void
    onRowAdded?: (fieldIds: string[]) => void  // Callback when a row is added
    onRowDeleted?: (fieldIds: string[]) => void  // Callback when a row is deleted
    className?: string
    showFieldHighlight?: boolean
    showAgentHighlight?: boolean
    defaultFontFamily?: string
    defaultFontSize?: string
    onUpdate?: () => void
}

const ContractEditor = forwardRef<ContractEditorRef, ContractEditorProps>(
    ({ initialContent, onChange, onUpdate, onRowAdded, onRowDeleted, className, showFieldHighlight = true, showAgentHighlight = true, defaultFontFamily, defaultFontSize }, ref) => {
        const editor = useEditor({
            extensions: [
                StarterKit.configure({
                    heading: {
                        levels: [1, 2, 3, 4],
                    },
                }),
                Table.extend({
                    addCommands() {
                        const parentCommands = this.parent?.() || {}
                        return {
                            ...parentCommands,
                            addRowAfter: () => ({ chain, state, dispatch }) => {
                                const { selection } = state
                                const { $from } = selection

                                // Find the table
                                let tableDepth = -1
                                for (let d = $from.depth; d > 0; d--) {
                                    if ($from.node(d).type.name === 'table') {
                                        tableDepth = d
                                        break
                                    }
                                }

                                const parentAddRowAfter = parentCommands.addRowAfter
                                if (!parentAddRowAfter) {
                                    return false
                                }

                                if (tableDepth === -1) {
                                    return chain().command(parentAddRowAfter()).run()
                                }

                                const tableNode = $from.node(tableDepth)
                                const tableStartPos = $from.start(tableDepth)

                                // Find template row (The Item Row)
                                // We look for a row that contains fields characteristic of an item (item_no, unit_price, etc.)
                                let templateRow: any = null
                                let templateRowOffset = 0

                                // Iterate all rows to find the best candidate
                                // We prefer the LAST matching row so we clone the most recent item
                                tableNode.forEach((row: any, offset: number) => {
                                    if (row.type.name !== 'tableRow') return

                                    let hasItemField = false
                                    let fieldCount = 0

                                    row.descendants((node: any) => {
                                        if (node.type.name === 'dataField') {
                                            fieldCount++
                                            const fid = node.attrs.fieldId || ''
                                            // Check for characteristic item fields
                                            if (fid.startsWith('item_no') ||
                                                fid.startsWith('unit_price') ||
                                                fid.startsWith('quantity') ||
                                                fid.startsWith('description') ||
                                                fid.startsWith('sub_total_price')) {
                                                hasItemField = true
                                            }
                                        }
                                    })

                                    // Check if this is a valid item row
                                    // Must have at least one item field AND multiple fields (to avoid false positives)
                                    // Also explicitly exclude Total row
                                    if (hasItemField && fieldCount >= 3) {
                                        let rowText = ''
                                        row.descendants((node: any) => {
                                            if (node.isText) {
                                                rowText += node.text
                                            }
                                        })

                                        if (!rowText.toLowerCase().includes('total')) {
                                            templateRow = row
                                            templateRowOffset = offset
                                        }
                                    }
                                })

                                if (!templateRow) {
                                    return chain().command(parentAddRowAfter()).run()
                                }

                                // Extract field structure from template row
                                const cellFields: Array<{ cellIndex: number, fields: Array<{ fieldId: string, marks: any[] }> }> = []
                                templateRow.forEach((cell: any, cellOffset: number, cellIndex: number) => {
                                    const fields: Array<{ fieldId: string, marks: any[] }> = []
                                    cell.descendants((node: any) => {
                                        if (node.type.name === 'dataField') {
                                            // Get the marks from the text content inside the dataField
                                            const marks: any[] = []
                                            node.content.forEach((textNode: any) => {
                                                if (textNode.marks) {
                                                    marks.push(...textNode.marks)
                                                }
                                            })
                                            fields.push({
                                                fieldId: node.attrs.fieldId,
                                                marks: marks
                                            })
                                        }
                                    })
                                    if (fields.length > 0) {
                                        cellFields.push({ cellIndex, fields })
                                    }
                                })

                                // Collect all existing field IDs
                                const existingFieldIds = new Set<string>()
                                state.doc.descendants((node: any) => {
                                    if (node.type.name === 'dataField') {
                                        existingFieldIds.add(node.attrs.fieldId)
                                    }
                                })

                                // Helper to get next incremented field ID
                                const getIncrementedFieldId = (baseFieldId: string): string => {
                                    const match = baseFieldId.match(/^(.*)_(\d+)$/)
                                    let baseName = baseFieldId
                                    let startCounter = 2

                                    if (match) {
                                        baseName = match[1]
                                    }

                                    let counter = startCounter
                                    let newId = `${baseName}_${counter}`
                                    while (existingFieldIds.has(newId)) {
                                        counter++
                                        newId = `${baseName}_${counter}`
                                    }
                                    existingFieldIds.add(newId)
                                    return newId
                                }

                                // Insert AFTER the template row
                                const insertPos = tableStartPos + templateRowOffset + templateRow.nodeSize

                                // Helper to recursively clone nodes and replace dataFields
                                const cloneNode = (node: any): any => {
                                    if (node.type.name === 'dataField') {
                                        const oldFieldId = node.attrs.fieldId

                                        // Special handling for currency: inherit value from previous row
                                        if (oldFieldId === 'currency') {
                                            return node.copy(node.content)
                                        }

                                        // For other fields: increment ID and reset to placeholder
                                        const newFieldId = getIncrementedFieldId(oldFieldId)
                                        const placeholder = `[${newFieldId}]`

                                        // Clone text content with all marks
                                        const newTextContent: any[] = []
                                        node.content.forEach((textNode: any) => {
                                            newTextContent.push(
                                                state.schema.text(placeholder, textNode.marks)
                                            )
                                        })

                                        return state.schema.nodes.dataField.create(
                                            { ...node.attrs, fieldId: newFieldId, source: null },
                                            newTextContent
                                        )
                                    } else if (node.content && node.content.size > 0) {
                                        // Recursively clone children
                                        const children: any[] = []
                                        node.content.forEach((child: any) => {
                                            children.push(cloneNode(child))
                                        })
                                        return node.type.create(node.attrs, children, node.marks)
                                    } else {
                                        // Leaf node - clone as-is
                                        return node.copy(node.content)
                                    }
                                }

                                // Clone entire template row
                                const clonedCells: any[] = []
                                templateRow.forEach((cell: any) => {
                                    clonedCells.push(cloneNode(cell))
                                })

                                const newRow = state.schema.nodes.tableRow.create(
                                    templateRow.attrs,
                                    clonedCells
                                )

                                // Execute: Insert row, then call callback
                                const result = chain()
                                    .command(({ tr }) => {
                                        tr.insert(insertPos, newRow)
                                        return true
                                    })
                                    .run()

                                // Extract new field IDs and call callback
                                if (result && onRowAdded) {
                                    const newFieldIds: string[] = []
                                    newRow.descendants((node: any) => {
                                        if (node.type.name === 'dataField') {
                                            newFieldIds.push(node.attrs.fieldId)
                                        }
                                    })
                                    if (newFieldIds.length > 0) {
                                        onRowAdded(newFieldIds)
                                    }
                                }

                                return result
                            },
                        }
                    },
                }).configure({
                    resizable: true,
                    HTMLAttributes: {
                        class: 'contract-table',
                    },
                }),
                TableRow,
                TableCell.extend({
                    addAttributes() {
                        return {
                            ...this.parent?.(),
                            class: {
                                default: null,
                                parseHTML: (element: HTMLElement) => element.getAttribute('class'),
                                renderHTML: (attributes: Record<string, any>) => {
                                    if (!attributes.class) {
                                        return {}
                                    }
                                    return { class: attributes.class }
                                },
                            },
                            style: {
                                default: null,
                                parseHTML: (element: HTMLElement) => element.getAttribute('style'),
                                renderHTML: (attributes: Record<string, any>) => {
                                    if (!attributes.style) {
                                        return {}
                                    }
                                    return { style: attributes.style }
                                },
                            },
                        }
                    },
                }),
                TableHeader.extend({
                    addAttributes() {
                        return {
                            ...this.parent?.(),
                            class: {
                                default: null,
                                parseHTML: (element: HTMLElement) => element.getAttribute('class'),
                                renderHTML: (attributes: Record<string, any>) => {
                                    if (!attributes.class) {
                                        return {}
                                    }
                                    return { class: attributes.class }
                                },
                            },
                            style: {
                                default: null,
                                parseHTML: (element: HTMLElement) => element.getAttribute('style'),
                                renderHTML: (attributes: Record<string, any>) => {
                                    if (!attributes.style) {
                                        return {}
                                    }
                                    return { style: attributes.style }
                                },
                            },
                        }
                    },
                }),
                Placeholder.configure({
                    placeholder: 'Start typing or ask AI for help...',
                }),
                // Underline, // Removed to fix duplicate extension warning
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                Highlight.configure({
                    multicolor: true,
                }),
                TextStyle,
                FontFamily,
                FontSize,
                Div,
                Checkbox,
                Radio,
                DataField,
                createRowDeletionDetector(onRowDeleted),
                AutoCalculation,
            ],
            content: initialContent || saleContractTemplateHTML,
            editorProps: {
                attributes: {
                    class: 'focus:outline-none min-h-[500px] p-4 w-full',
                },
            },
            onUpdate: ({ editor }) => {
                // Call the onUpdate prop if provided (to trigger parent re-renders)
                onUpdate?.()

                // 1. Call onChange prop
                onChange?.(editor.getHTML())

                // Skip if currently syncing
                if (isSyncing) return

                const { state, view } = editor
                const { selection, doc } = state
                const $from = selection.$from

                // Find the dataField at current selection
                let sourceFieldId: string | null = null
                let sourceContent: string | null = null
                let sourcePos: number | null = null

                for (let d = $from.depth; d > 0; d--) {
                    const node = $from.node(d)
                    if (node.type.name === 'dataField') {
                        sourceFieldId = node.attrs.fieldId
                        sourceContent = node.textContent
                        sourcePos = $from.before(d)
                        break
                    }
                }

                // Build transaction for sync and placeholder restoration
                const tr = state.tr
                let modified = false

                // 1. Auto-restore empty fields to placeholder - REMOVED (Handled by ProseMirror Plugin)
                // The 'dataFieldProtection' plugin in DataField extension now handles this via appendTransaction
                // which prevents the cursor from jumping out.

                // 2. Sync same-fieldId nodes (if we're in a dataField)
                if (sourceFieldId && sourceContent !== null && sourcePos !== null) {
                    const isPlaceholder = sourceContent === '' || sourceContent === `[${sourceFieldId}]`
                    const targetValue = isPlaceholder ? `[${sourceFieldId}]` : sourceContent

                    // Set source to 'user' for the field being edited (if not placeholder)
                    if (!isPlaceholder) {
                        const sourceNode = doc.nodeAt(sourcePos)
                        if (sourceNode && sourceNode.attrs.source !== 'user' && sourceNode.attrs.source !== 'agent') {
                            tr.setNodeMarkup(sourcePos, undefined, { ...sourceNode.attrs, source: 'user' })
                            modified = true
                        }
                    }

                    // Collect nodes to sync (from current state, accounting for any placeholder restorations)
                    const nodesToSync: { pos: number; node: any }[] = []
                    doc.descendants((node: any, pos: number) => {
                        if (node.type.name === 'dataField' &&
                            node.attrs.fieldId === sourceFieldId &&
                            pos !== sourcePos &&
                            node.textContent !== targetValue &&
                            node.textContent !== '') { // Skip empty (will be placeholder-restored)
                            nodesToSync.push({ pos, node })
                        }
                    })

                    // Sort by position descending and apply
                    nodesToSync.sort((a, b) => b.pos - a.pos)
                    for (const { pos, node } of nodesToSync) {
                        tr.replaceWith(pos + 1, pos + node.nodeSize - 1, state.schema.text(targetValue))
                        // Set source to 'mapped' for synced fields (or null for placeholder)
                        tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            source: isPlaceholder ? null : 'mapped'
                        })
                        modified = true
                    }
                }

                if (modified) {
                    isSyncing = true
                    view.dispatch(tr)
                    isSyncing = false
                }
            },
            immediatelyRender: false,
        })

        // Expose methods to parent components via ref
        useImperativeHandle(ref, () => ({
            getContent: () => editor?.getHTML() || '',
            getJSON: () => editor?.getJSON() || {},
            setContent: (content: string) => {
                editor?.commands.setContent(content)
            },
            insertContent: (content: string) => {
                editor?.commands.insertContent(content)
            },
            replaceSelection: (content: string) => {
                editor?.commands.insertContent(content)
            },
            applyFieldChanges: (changes: FieldChange[]) => {
                if (!editor || changes.length === 0) return

                const { state, view } = editor
                const tr = state.tr
                let modified = false

                // Build a map of fieldId -> value for quick lookup
                const changesMap = new Map(changes.map(c => [c.fieldId, c.value]))

                // Collect all nodes to update (in reverse order to avoid position shifts)
                const nodesToUpdate: { pos: number; node: any; newValue: string }[] = []

                state.doc.descendants((node: any, pos: number) => {
                    if (node.type.name === 'dataField') {
                        const fieldId = node.attrs.fieldId
                        if (changesMap.has(fieldId)) {
                            const newValue = changesMap.get(fieldId)!
                            const currentText = node.textContent
                            const placeholder = `[${fieldId}]`

                            // Only update if value is different and not already the same
                            if (currentText !== newValue && newValue !== placeholder) {
                                nodesToUpdate.push({ pos, node, newValue })
                            }
                        }
                    }
                })

                // Sort by position descending to avoid position shifts
                nodesToUpdate.sort((a, b) => b.pos - a.pos)

                // Apply updates
                for (const { pos, node, newValue } of nodesToUpdate) {
                    // Replace text content
                    tr.replaceWith(
                        pos + 1,
                        pos + node.nodeSize - 1,
                        state.schema.text(newValue)
                    )
                    // Set source to 'agent'
                    tr.setNodeMarkup(pos, undefined, { ...node.attrs, source: 'agent' })
                    modified = true
                }

                if (modified) {
                    // Use syncing flag to prevent onUpdate sync loop
                    isSyncing = true
                    view.dispatch(tr)
                    isSyncing = false
                }
            },
        }))

        // Handle keyboard shortcuts
        const handleKeyDown = useCallback((event: KeyboardEvent) => {
            // Cmd/Ctrl + S to save
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault()
                // Trigger save - implement your save logic here
            }
        }, [])

        const hasInitialized = useRef(false);

        // Reset hasInitialized when editor instance changes
        useEffect(() => {
            if (editor) {
                hasInitialized.current = false;
            }
        }, [editor]);

        useEffect(() => {
            if (editor && initialContent !== undefined && !hasInitialized.current) {
                // Only set content on initial mount of this editor instance
                editor.commands.setContent(initialContent);

                // [ADDED] Synchronize conditional fields based on radio button state
                // This ensures that loaded documents correctly reflect the disabled state of fields
                const updates: { pos: number, attrs: any }[] = [];
                const radios: { checked: boolean, linkedField: string }[] = [];

                editor.state.doc.descendants((node, pos) => {
                    if (node.type.name === 'radio' && node.attrs.linkedField) {
                        radios.push({ checked: node.attrs.checked, linkedField: node.attrs.linkedField });
                    }
                    return true;
                });

                if (radios.length > 0) {
                    editor.state.doc.descendants((node, pos) => {
                        if (node.type.name === 'dataField') {
                            const fieldId = node.attrs.fieldId;
                            const controllingRadio = radios.find(r => r.linkedField === fieldId);

                            if (controllingRadio) {
                                const shouldBeDisabled = !controllingRadio.checked;
                                // Only update if state is different to avoid unnecessary changes
                                if (node.attrs.disabled !== shouldBeDisabled) {
                                    updates.push({ pos, attrs: { ...node.attrs, disabled: shouldBeDisabled } });
                                }
                            }
                        }
                        return true;
                    });
                }

                if (updates.length > 0) {
                    let tr = editor.state.tr;
                    // Apply updates in reverse order to preserve positions? 
                    // setNodeMarkup doesn't change document length, so order doesn't matter for positions.
                    updates.forEach(update => {
                        tr = tr.setNodeMarkup(update.pos, undefined, update.attrs);
                    });
                    editor.view.dispatch(tr);
                }

                hasInitialized.current = true;
            }
        }, [editor, initialContent]);

        useEffect(() => {
            document.addEventListener('keydown', handleKeyDown)
            return () => {
                document.removeEventListener('keydown', handleKeyDown)
            }
        }, [handleKeyDown])

        if (!editor) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            )
        }

        return (
            <div
                className={`contract-editor flex flex-col h-full ${showFieldHighlight ? 'show-field-highlight' : ''} ${showAgentHighlight ? 'show-agent-highlight' : ''} ${className || ''}`}
                onClick={() => {
                    // [CHANGED] Immediate focus on container click
                    if (editor && !editor.isFocused) {
                        editor.chain().focus().run();
                    }
                }}
            >
                <EditorToolbar editor={editor} defaultFontFamily={defaultFontFamily} defaultFontSize={defaultFontSize} />
                <div className="flex-1 border border-gray-200 rounded-b-lg bg-white overflow-y-auto min-h-0 cursor-text">
                    <EditorContent editor={editor} className="h-full" />
                </div>
            </div>
        )
    }
)

ContractEditor.displayName = 'ContractEditor'

export default ContractEditor

