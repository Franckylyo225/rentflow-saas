import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Undo, Redo, Code, Minus, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Table as TableIcon, ImageIcon, Palette, Highlighter,
  Plus, Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";
import { Separator } from "@/components/ui/separator";

const VARIABLES = [
  { key: "{{tenant_name}}", label: "Nom du locataire" },
  { key: "{{tenant_phone}}", label: "Téléphone locataire" },
  { key: "{{property_name}}", label: "Nom du bien" },
  { key: "{{unit_name}}", label: "Nom de l'unité" },
  { key: "{{rent_amount}}", label: "Montant du loyer" },
  { key: "{{start_date}}", label: "Date de début" },
  { key: "{{end_date}}", label: "Date de fin" },
  { key: "{{agency_name}}", label: "Nom de l'agence" },
];

const TEXT_COLORS = [
  { color: "#000000", label: "Noir" },
  { color: "#374151", label: "Gris foncé" },
  { color: "#6B7280", label: "Gris" },
  { color: "#DC2626", label: "Rouge" },
  { color: "#EA580C", label: "Orange" },
  { color: "#CA8A04", label: "Jaune" },
  { color: "#16A34A", label: "Vert" },
  { color: "#2563EB", label: "Bleu" },
  { color: "#7C3AED", label: "Violet" },
];

const HIGHLIGHT_COLORS = [
  { color: "#FEF08A", label: "Jaune" },
  { color: "#BBF7D0", label: "Vert" },
  { color: "#BFDBFE", label: "Bleu" },
  { color: "#FBCFE8", label: "Rose" },
  { color: "#FED7AA", label: "Orange" },
  { color: "#E9D5FF", label: "Violet" },
];

interface ContractEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  borderless?: boolean;
}

function ToolbarButton({
  active,
  onClick,
  disabled,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      disabled={disabled}
      type="button"
      title={title}
    >
      {children}
    </Button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export function ContractEditor({ content, onChange, editable = true, placeholder, borderless = false }: ContractEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || "Commencez à rédiger votre contrat..." }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  const insertVariable = (variable: string) => {
    editor.chain().focus().insertContent(variable).run();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      editor.chain().focus().setImage({ src: result }).run();
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const insertImageFromUrl = () => {
    const url = prompt("URL de l'image :");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className={`overflow-hidden bg-background ${borderless ? "" : "border border-border rounded-lg"}`}>
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
          {/* Text formatting */}
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné">
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Headings */}
          <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Titre 1">
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Alignment */}
          <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Aligner à gauche">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centrer">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Aligner à droite">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justifier">
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Lists */}
          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Ligne horizontale">
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Colors */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" title="Couleur du texte">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">Couleur du texte</p>
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                    onClick={() => editor.chain().focus().setColor(c.color).run()}
                    type="button"
                  />
                ))}
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground mt-2 w-full text-left"
                onClick={() => editor.chain().focus().unsetColor().run()}
                type="button"
              >
                Réinitialiser
              </button>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" title="Surlignage">
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <p className="text-xs font-medium text-muted-foreground mb-2">Surlignage</p>
              <div className="grid grid-cols-3 gap-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.color}
                    className="w-7 h-7 rounded-md border border-border hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.color }}
                    title={c.label}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: c.color }).run()}
                    type="button"
                  />
                ))}
              </div>
              <button
                className="text-xs text-muted-foreground hover:text-foreground mt-2 w-full text-left"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                type="button"
              >
                Supprimer
              </button>
            </PopoverContent>
          </Popover>

          <ToolbarSep />

          {/* Table */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" title="Tableau">
                <TableIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                <Plus className="h-3.5 w-3.5 mr-2" /> Insérer un tableau
              </DropdownMenuItem>
              {editor.isActive("table") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                    Ajouter colonne
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                    Ajouter ligne
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                    Supprimer colonne
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                    Supprimer ligne
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer le tableau
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Image */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" title="Image">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                Importer un fichier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={insertImageFromUrl}>
                Depuis une URL
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <ToolbarSep />

          {/* Undo/Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">
            <Redo className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSep />

          {/* Variables */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" type="button">
                <Code className="h-3.5 w-3.5" />
                Variables
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {VARIABLES.map((v) => (
                <DropdownMenuItem key={v.key} onClick={() => insertVariable(v.key)}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-sm">{v.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                      {v.key}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_td]:min-w-[80px] [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted/50 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:my-2 [&_.ProseMirror_.selectedCell]:bg-primary/10"
      />
    </div>
  );
}

export { VARIABLES };
