import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Extension } from "@tiptap/core";

// Lucide icons
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent as IndentIcon,
  Outdent as OutdentIcon,
  Quote,
  Minus,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Table as TableIcon,
  Palette,
  Highlighter,
  Scissors,
  Plus,
  Trash2,
  Columns
} from "lucide-react";

// --- CUSTOM FONT SIZE EXTENSION ---
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return {
      types: ["textStyle"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    } as any;
  },
});

// --- CUSTOM INDENT EXTENSION (MARGIN-LEFT INLINE STYLE) ---
export interface IndentOptions {
  types: string[];
  minIndent: number;
  maxIndent: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const Indent = Extension.create<IndentOptions>({
  name: "indent",
  addOptions() {
    return {
      types: ["paragraph", "heading", "blockquote"],
      minIndent: 0,
      maxIndent: 10,
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const style = element.style.marginLeft;
              if (!style) return 0;
              const matches = style.match(/^(\d+)px$/);
              if (matches) {
                return Math.floor(parseInt(matches[1], 10) / 24);
              }
              return 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) {
                return {};
              }
              return {
                style: `margin-left: ${attributes.indent * 24}px`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          tr = tr.setSelection(selection);
          let updated = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent < this.options.maxIndent) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent + 1,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
          }
          return updated;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          tr = tr.setSelection(selection);
          let updated = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent > this.options.minIndent) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: currentIndent - 1,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
          }
          return updated;
        },
    } as any;
  },
});

interface WysiwygEditorProps {
  value: string;
  onChange: (newValue: string) => void;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ value, onChange }) => {
  const [fontColor, setFontColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showHighlightDropdown, setShowHighlightDropdown] = useState(false);

  const colors = [
    "#000000", "#475569", "#dc2626", "#ea580c", "#ca8a04", 
    "#16a34a", "#2563eb", "#4f46e5", "#7c3aed", "#db2777"
  ];

  const highlights = [
    "#ffff00", "#86efac", "#93c5fd", "#fca5a5", "#fef08a", 
    "#f472b6", "#c084fc", "#fed7aa", "#e2e8f0", "transparent"
  ];

  const fontSizes = [
    { label: "8 pt", value: "8pt" },
    { label: "9 pt", value: "9pt" },
    { label: "10 pt", value: "10pt" },
    { label: "11 pt", value: "11pt" },
    { label: "12 pt", value: "12pt" },
    { label: "14 pt", value: "14pt" },
    { label: "16 pt", value: "16pt" },
    { label: "18 pt", value: "18pt" },
    { label: "24 pt", value: "24pt" },
    { label: "36 pt", value: "36pt" }
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#0078D4] underline cursor-pointer",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse border border-slate-300 w-full my-4 text-[9pt]",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-slate-300 bg-slate-50 p-2 font-bold text-left",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-slate-300 p-2",
        },
      }),
      FontSize,
      Indent,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-hidden prose prose-sm max-w-none flex-1 font-sans p-6 min-h-[700px] overflow-y-auto leading-relaxed",
        style: "font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.6; color: #1e293b;",
      },
    },
  });

  // Keep content in sync if parent value changes outside of editor input
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-slate-400 font-sans text-xs">
        Editör Yükleniyor...
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Bağlantı URL'sini girin:", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertPageBreak = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<p style="page-break-after: always; border-top: 1px dashed #ef4444; margin: 24px 0; padding-top: 8px; color: #ef4444; font-size: 9px; font-weight: bold; text-align: center; font-family: sans-serif; user-select: none;" class="page-break-indicator" data-page-break="true">📄 SAYFA SONU (PAGE BREAK)</p>`
      )
      .run();
  };

  const getActiveFontSizeLabel = () => {
    const attrs = editor.getAttributes("textStyle");
    if (attrs && attrs.fontSize) {
      const match = fontSizes.find(f => f.value === attrs.fontSize);
      return match ? match.label : attrs.fontSize;
    }
    return "9 pt";
  };

  return (
    <div className="flex flex-col border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-[#1f1f1f] w-full shadow-sm text-slate-800 dark:text-zinc-100">
      
      {/* WORD / DOCS STYLE RICH TOOLBAR */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-[#252423] border-b border-slate-200 dark:border-zinc-800 no-print select-none">
        
        {/* UNDO / REDO GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 disabled:opacity-30 cursor-pointer"
            title="Geri Al (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 disabled:opacity-30 cursor-pointer"
            title="Yinele (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* HEADINGS / STYLE DROP-DOWN */}
        <div className="flex items-center gap-0.5 mr-2">
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else if (val.startsWith("h")) {
                const level = parseInt(val.substring(1), 10) as 1 | 2 | 3 | 4;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
            value={
              editor.isActive("heading", { level: 1 })
                ? "h1"
                : editor.isActive("heading", { level: 2 })
                ? "h2"
                : editor.isActive("heading", { level: 3 })
                ? "h3"
                : editor.isActive("heading", { level: 4 })
                ? "h4"
                : "paragraph"
            }
            className="p-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-xs font-bold text-slate-700 dark:text-zinc-200 focus:outline-hidden"
          >
            <option value="paragraph">Düz Yazı (Paragraf)</option>
            <option value="h1">Başlık 1 (H1)</option>
            <option value="h2">Başlık 2 (H2)</option>
            <option value="h3">Başlık 3 (H3)</option>
            <option value="h4">Başlık 4 (H4)</option>
          </select>
        </div>

        {/* FONT SIZE DROPDOWN */}
        <div className="flex items-center gap-0.5 mr-2 relative">
          <select
            value={editor.getAttributes("textStyle").fontSize || "9pt"}
            onChange={(e) => {
              editor.chain().focus().setFontSize(e.target.value).run();
            }}
            className="p-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded text-xs font-mono text-[#0078D4] dark:text-blue-400 font-bold focus:outline-hidden"
            title="Yazı Boyutu"
          >
            {fontSizes.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* INLINE STYLES GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("bold")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white font-bold"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Kalın (Ctrl+B)"
          >
            <BoldIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("italic")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Eğik (Ctrl+I)"
          >
            <ItalicIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("underline")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Altı Çizili (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("strike")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Üstü Çizili"
          >
            <StrikethroughIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* COLORS & HIGHLIGHTS GROUP */}
        <div className="flex items-center gap-1 mr-2 relative">
          
          {/* FONT COLOR BUTTON */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setShowColorDropdown(!showColorDropdown);
                setShowHighlightDropdown(false);
              }}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded flex items-center gap-0.5 text-slate-600 dark:text-zinc-350 cursor-pointer"
              title="Yazı Rengi"
            >
              <Palette className="w-3.5 h-3.5" />
              <div 
                className="w-2.5 h-2.5 rounded-full border border-slate-300"
                style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
              />
            </button>
            {showColorDropdown && (
              <div className="absolute top-8 left-0 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-lg p-2 flex flex-wrap gap-1 w-36 z-50">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(c).run();
                      setShowColorDropdown(false);
                    }}
                    className="w-5 h-5 rounded border border-slate-200 cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorDropdown(false);
                  }}
                  className="w-full text-[10px] text-center bg-slate-100 dark:bg-zinc-700 p-1 rounded font-bold hover:bg-slate-200 dark:hover:bg-zinc-600 cursor-pointer"
                >
                  Sıfırla
                </button>
              </div>
            )}
          </div>

          {/* HIGHLIGHT BUTTON */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setShowHighlightDropdown(!showHighlightDropdown);
                setShowColorDropdown(false);
              }}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded flex items-center gap-0.5 text-slate-600 dark:text-zinc-350 cursor-pointer"
              title="Metin Vurgu Rengi"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <div 
                className="w-2.5 h-2.5 rounded-sm border border-slate-300"
                style={{ 
                  backgroundColor: 
                    editor.isActive("highlight") 
                      ? (editor.getAttributes("highlight").color || "#ffff00") 
                      : "transparent" 
                }}
              />
            </button>
            {showHighlightDropdown && (
              <div className="absolute top-8 left-0 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded shadow-lg p-2 flex flex-wrap gap-1 w-36 z-50">
                {highlights.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      if (h === "transparent") {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().setHighlight({ color: h }).run();
                      }
                      setShowHighlightDropdown(false);
                    }}
                    className="w-5 h-5 rounded border border-slate-200 cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: h === "transparent" ? "#f1f5f9" : h, position: "relative" }}
                    title={h === "transparent" ? "Temizle" : h}
                  >
                    {h === "transparent" && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400">X</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* ALIGNMENTS GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "left" })
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Sola Hizala"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "center" })
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Ortala"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "right" })
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Sağa Hizala"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "justify" })
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="İki Yana Yasla"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* LISTS GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("bulletList")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Maddeli Liste"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("orderedList")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Numaralı Liste"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* INDENTATION GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().outdent().run()}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 cursor-pointer"
            title="Girintiyi Azalt"
          >
            <OutdentIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().indent().run()}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 cursor-pointer"
            title="Girintiyi Artır"
          >
            <IndentIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* QUOTE & HR & PAGE BREAK GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("blockquote")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Alıntı Blok"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 cursor-pointer"
            title="Yatay Çizgi Ekle"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={insertPageBreak}
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-650 rounded text-rose-600 cursor-pointer font-bold flex items-center gap-1 text-[10px]"
            title="Sayfa Sonu Ekle (PDF Çıktı Alırken Yeni Sayfaya Geçer)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Sayfa Sonu</span>
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* HYPERLINKS GROUP */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            type="button"
            onClick={setLink}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("link")
                ? "bg-slate-200 dark:bg-zinc-750 text-slate-900 dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-350"
            }`}
            title="Bağlantı (Köprü) Ekle"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editor.isActive("link")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 disabled:opacity-30 cursor-pointer"
            title="Bağlantıyı Kaldır"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1" />

        {/* TABLE ACTION GROUP */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-zinc-350 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
            title="Tablo Ekle (3x3)"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tablo</span>
          </button>

          {editor.isActive("table") && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded border border-slate-200 dark:border-zinc-700 animate-fade-in">
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-[9px] font-bold text-slate-600 dark:text-zinc-300"
                title="Sola Sütun Ekle"
              >
                +Sütun Sola
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-[9px] font-bold text-slate-600 dark:text-zinc-300"
                title="Sağa Sütun Ekle"
              >
                +Sütun Sağa
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-650 rounded text-[9px] font-bold text-red-600"
                title="Sütunu Sil"
              >
                Sütun Sil
              </button>
              <div className="w-px h-3 bg-slate-300 mx-0.5" />
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-[9px] font-bold text-slate-600 dark:text-zinc-300"
                title="Üste Satır Ekle"
              >
                +Satır Üste
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-[9px] font-bold text-slate-600 dark:text-zinc-300"
                title="Alta Satır Ekle"
              >
                +Satır Alta
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-650 rounded text-[9px] font-bold text-red-600"
                title="Satırı Sil"
              >
                Satır Sil
              </button>
              <div className="w-px h-3 bg-slate-300 mx-0.5" />
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-1 hover:bg-red-600 hover:text-white rounded text-[9px] font-bold text-red-600"
                title="Tabloyu Tamamen Kaldır"
              >
                Tablo Sil
              </button>
            </div>
          )}
        </div>

      </div>

      {/* TIPTAP EDITOR MOUNT ELEMENT */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] rounded-b min-h-[700px] prose-style-scope">
        <EditorContent editor={editor} className="min-h-[700px] h-full" />
      </div>

      <style>{`
        /* WYSIWYG Specific Style Fixes & Word-Processor Simulation */
        .prose-style-scope .ProseMirror {
          min-height: 700px;
          outline: none !important;
        }
        
        .prose-style-scope .ProseMirror p {
          margin-top: 0;
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        
        .prose-style-scope .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1.5rem 0;
          overflow: hidden;
        }

        .prose-style-scope .ProseMirror table td,
        .prose-style-scope .ProseMirror table th {
          min-width: 1em;
          border: 1px solid #cbd5e1;
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }

        .prose-style-scope .ProseMirror table th {
          font-weight: bold;
          text-align: left;
          background-color: #f8fafc;
        }

        .prose-style-scope .ProseMirror blockquote {
          border-left: 4px solid #0078D4;
          padding-left: 1rem;
          color: #475569;
          font-style: italic;
          margin: 1rem 0;
        }

        .prose-style-scope .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }

        .prose-style-scope .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }

        .prose-style-scope .ProseMirror li {
          margin-bottom: 0.25rem !important;
        }

        .prose-style-scope .ProseMirror a {
          color: #0078D4;
          text-decoration: underline;
        }

        .prose-style-scope .ProseMirror hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1.5rem 0;
        }

        /* Prevent system template variables like {{COMPANY_TITLE}} from breaking up */
        .prose-style-scope .ProseMirror span[data-variable="true"] {
          background-color: #f1f5f9;
          color: #0f172a;
          padding: 1px 4px;
          border-radius: 2px;
          font-family: monospace;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};
