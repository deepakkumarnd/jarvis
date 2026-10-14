import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from '@/components/layout'
import { Toaster } from '@/components/ui/sonner'
import { DashboardPage } from '@/pages/dashboard'
import './index.css'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      // Feature pages are code-split so the Markdown renderer only loads when needed
      { path: 'bookmarks', lazy: () => import('@/pages/bookmarks').then((m) => ({ Component: m.BookmarksPage })) },
      { path: 'notes', lazy: () => import('@/pages/notes').then((m) => ({ Component: m.NotesPage })) },
      { path: 'notes/new', lazy: () => import('@/pages/note-editor').then((m) => ({ Component: m.NoteEditorPage })) },
      { path: 'notes/:id', lazy: () => import('@/pages/note-view').then((m) => ({ Component: m.NoteViewPage })) },
      { path: 'notes/:id/edit', lazy: () => import('@/pages/note-editor').then((m) => ({ Component: m.NoteEditorPage })) },
      { path: 'todos', lazy: () => import('@/pages/todos').then((m) => ({ Component: m.TodosPage })) },
      { path: 'documents', lazy: () => import('@/pages/documents').then((m) => ({ Component: m.DocumentsPage })) },
      { path: 'documents/new', lazy: () => import('@/pages/document-new').then((m) => ({ Component: m.NewDocumentPage })) },
      { path: 'documents/:id', lazy: () => import('@/pages/document-detail').then((m) => ({ Component: m.DocumentDetailPage })) },
      { path: 'credentials', lazy: () => import('@/pages/credentials').then((m) => ({ Component: m.CredentialsPage })) },
      { path: 'credentials/:id', lazy: () => import('@/pages/credential-group').then((m) => ({ Component: m.CredentialGroupPage })) },
      { path: 'settings', lazy: () => import('@/pages/settings').then((m) => ({ Component: m.SettingsPage })) },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors />
    </QueryClientProvider>
  </StrictMode>,
)
