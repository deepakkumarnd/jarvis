import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

const externalLinks: Components = {
  a: ({ href, title, children }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

// Used inside clickable cards, where nested <a> elements are invalid
const inertLinks: Components = {
  a: ({ children }) => <span className="underline">{children}</span>,
}

type Props = {
  children: string
  className?: string
  /** Render links as plain text, e.g. for previews inside a link */
  disableLinks?: boolean
}

/**
 * Renders GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks).
 * Raw HTML is not rendered and unsafe URLs (e.g. javascript:) are stripped by react-markdown.
 */
export function Markdown({ children, className, disableLinks }: Props) {
  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none dark:prose-invert prose-headings:font-heading prose-pre:bg-muted prose-pre:text-foreground',
        // GFM task list items: checkbox instead of a bullet
        '[&_.task-list-item]:list-none [&_.task-list-item_input]:mr-2',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={disableLinks ? inertLinks : externalLinks}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
