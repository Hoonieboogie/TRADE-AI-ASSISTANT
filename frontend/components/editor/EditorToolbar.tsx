import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Heading1,
    Heading2,
    Heading3,
    Table,
    Undo,
    Redo,
    Highlighter,
    Minus,
    Plus,
    ArrowDown,
    ArrowRight,
} from 'lucide-react'

interface EditorToolbarProps {
    editor: Editor
    defaultFontFamily?: string
    defaultFontSize?: string
}

interface ToolbarButtonProps {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isActive ? 'bg-gray-200 text-blue-600' : 'text-gray-700'
                }`}
        >
            {children}
        </button>
    )
}

function ToolbarDivider() {
    return <div className="w-px h-6 bg-gray-300 mx-1" />
}

export default function EditorToolbar({ editor, defaultFontFamily = 'Arial', defaultFontSize = '16px' }: EditorToolbarProps) {
    const [, setForceUpdate] = useState(0)

    useEffect(() => {
        if (!editor) return

        const updateToolbar = () => {
            setForceUpdate((prev) => prev + 1)
        }

        editor.on('selectionUpdate', updateToolbar)
        editor.on('transaction', updateToolbar)

        return () => {
            editor.off('selectionUpdate', updateToolbar)
            editor.off('transaction', updateToolbar)
        }
    }, [editor])

    if (!editor) {
        return null
    }

    return (
        <div
            className="flex flex-wrap items-center gap-1 p-2 border border-b-0 border-gray-200 rounded-t-lg bg-gray-50 relative z-10"
            onClick={(e) => e.stopPropagation()}
        >
            {/* History */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo (Ctrl+Z)"
            >
                <Undo size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo (Ctrl+Y)"
            >
                <Redo size={18} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <Heading1 size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <Heading2 size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <Heading3 size={18} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Font Family */}
            <select
                className="h-8 text-sm border border-gray-300 rounded px-2 text-gray-700 focus:outline-none focus:border-blue-500"
                onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
                value={editor.getAttributes('textStyle').fontFamily || defaultFontFamily}
            >
                <option value="" disabled>Font</option>
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Courier New">Courier New</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
            </select>

            {/* Font Size */}
            <select
                className="h-8 text-sm border border-gray-300 rounded px-2 text-gray-700 focus:outline-none focus:border-blue-500 w-20"
                onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                        editor.chain().focus().setFontSize(value).run();
                    } else {
                        editor.chain().focus().unsetFontSize().run();
                    }
                }}
                value={editor.getAttributes('textStyle').fontSize || defaultFontSize}
            >
                <option value="" disabled>Size</option>
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="24px">24px</option>
                <option value="30px">30px</option>
                <option value="36px">36px</option>
                <option value="48px">48px</option>
                <option value="60px">60px</option>
                <option value="72px">72px</option>
                <option value="96px">96px</option>
            </select>

            <ToolbarDivider />

            {/* Text formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
            >
                <Bold size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
            >
                <Italic size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
            >
                <Underline size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <Strikethrough size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
                isActive={editor.isActive('highlight')}
                title="Highlight"
            >
                <Highlighter size={18} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <List size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
            >
                <ListOrdered size={18} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <AlignLeft size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <AlignCenter size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <AlignRight size={18} />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                isActive={editor.isActive({ textAlign: 'justify' })}
                title="Justify"
            >
                <AlignJustify size={18} />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Table */}
            <ToolbarButton
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                title="Insert Table"
            >
                <Table size={18} />
            </ToolbarButton>

            {editor.isActive('table') && (
                <>
                    <ToolbarDivider />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        title="Add Row After"
                    >
                        <div className="flex items-center relative">
                            <Table size={18} className="opacity-50" />
                            <Plus size={10} className="absolute -bottom-1 -right-1 bg-green-100 rounded-full text-green-600" />
                            <ArrowDown size={10} className="absolute -bottom-1 -left-1 bg-blue-100 rounded-full text-blue-600" />
                        </div>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        title="Delete Row"
                    >
                        <div className="flex items-center relative">
                            <Table size={18} className="opacity-50" />
                            <Minus size={10} className="absolute -bottom-1 -right-1 bg-red-100 rounded-full text-red-600" />
                            <ArrowDown size={10} className="absolute -bottom-1 -left-1 bg-blue-100 rounded-full text-blue-600" />
                        </div>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        title="Add Column After"
                    >
                        <div className="flex items-center relative">
                            <Table size={18} className="opacity-50" />
                            <Plus size={10} className="absolute -bottom-1 -right-1 bg-green-100 rounded-full text-green-600" />
                            <ArrowRight size={10} className="absolute -top-1 -right-1 bg-blue-100 rounded-full text-blue-600" />
                        </div>
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                        title="Delete Column"
                    >
                        <div className="flex items-center relative">
                            <Table size={18} className="opacity-50" />
                            <Minus size={10} className="absolute -bottom-1 -right-1 bg-red-100 rounded-full text-red-600" />
                            <ArrowRight size={10} className="absolute -top-1 -right-1 bg-blue-100 rounded-full text-blue-600" />
                        </div>
                    </ToolbarButton>
                </>
            )}

            {/* Horizontal Rule */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                <Minus size={18} />
            </ToolbarButton>
        </div>
    )
}
