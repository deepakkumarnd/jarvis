import { useRef, type KeyboardEvent } from 'react'
import { Bold, Code, Heading2, Italic, Link, List, ListChecks, ListOrdered, Quote, Strikethrough, type LucideIcon } from 'lucide-react'
import { Markdown } from '@/components/markdown'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type Format =
  | { kind: 'wrap'; before: string; after: string; placeholder: string }
  | { kind: 'line'; prefix: string }

const actions: { label: string; icon: LucideIcon; shortcut?: string; format: Format }[] = [
  { label: 'Heading', icon: Heading2, format: { kind: 'line', prefix: '## ' } },
  { label: 'Bold', icon: Bold, shortcut: 'b', format: { kind: 'wrap', before: '**', after: '**', placeholder: 'bold text' } },
  { label: 'Italic', icon: Italic, shortcut: 'i', format: { kind: 'wrap', before: '_', after: '_', placeholder: 'italic text' } },
  { label: 'Strikethrough', icon: Strikethrough, format: { kind: 'wrap', before: '~~', after: '~~', placeholder: 'text' } },
  { label: 'Code', icon: Code, shortcut: 'e', format: { kind: 'wrap', before: '`', after: '`', placeholder: 'code' } },
  { label: 'Link', icon: Link, shortcut: 'k', format: { kind: 'wrap', before: '[', after: '](https://)', placeholder: 'link text' } },
  { label: 'Quote', icon: Quote, format: { kind: 'line', prefix: '> ' } },
  { label: 'Bulleted list', icon: List, format: { kind: 'line', prefix: '- ' } },
  { label: 'Numbered list', icon: ListOrdered, format: { kind: 'line', prefix: '1. ' } },
  { label: 'Task list', icon: ListChecks, format: { kind: 'line', prefix: '- [ ] ' } },
]

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'aria-invalid'?: boolean
}

export function MarkdownEditor({ id, value, onChange, placeholder, 'aria-invalid': ariaInvalid }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function apply(format: Format) {
    const textarea = textareaRef.current
    if (!textarea) return
    const { selectionStart: start, selectionEnd: end } = textarea
    const selected = value.slice(start, end)

    let replaceFrom = start
    let insert: string
    let selectFrom: number
    let selectTo: number

    if (format.kind === 'wrap') {
      const text = selected || format.placeholder
      insert = format.before + text + format.after
      selectFrom = start + format.before.length
      selectTo = selectFrom + text.length
    } else {
      // Prefix every line touched by the selection
      replaceFrom = value.lastIndexOf('\n', start - 1) + 1
      const block = value.slice(replaceFrom, end)
      insert = block
        .split('\n')
        .map((line, i) => (format.prefix === '1. ' ? `${i + 1}. ` : format.prefix) + line)
        .join('\n')
      selectFrom = replaceFrom + insert.length
      selectTo = selectFrom
    }

    textarea.focus()
    textarea.setSelectionRange(replaceFrom, end)
    // insertText keeps the browser's undo history and lets us place the cursor immediately.
    // Where unsupported, update the controlled value and place the cursor after React re-renders.
    if (document.execCommand('insertText', false, insert)) {
      textarea.setSelectionRange(selectFrom, selectTo)
    } else {
      onChange(value.slice(0, replaceFrom) + insert + value.slice(end))
      requestAnimationFrame(() => textarea.setSelectionRange(selectFrom, selectTo))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(isMac ? event.metaKey : event.ctrlKey)) return
    const action = actions.find((a) => a.shortcut === event.key.toLowerCase())
    if (action) {
      event.preventDefault()
      apply(action.format)
    }
  }

  const modifier = isMac ? '⌘' : 'Ctrl+'

  return (
    <Tabs defaultValue="write" className="gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <span className="text-xs text-muted-foreground">Markdown supported</span>
      </div>

      <TabsContent value="write" className="space-y-2">
        <div className="flex flex-wrap gap-0.5 rounded-lg border p-1" role="toolbar" aria-label="Formatting">
          {actions.map(({ label, icon: Icon, shortcut, format }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => apply(format)}
              aria-label={label}
              title={shortcut ? `${label} (${modifier}${shortcut.toUpperCase()})` : label}
            >
              <Icon />
            </Button>
          ))}
        </div>
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          className="min-h-80 font-mono text-sm leading-relaxed"
        />
      </TabsContent>

      <TabsContent value="preview">
        <div className="min-h-80 rounded-lg border p-4">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}
        </div>
      </TabsContent>
    </Tabs>
  )
}
