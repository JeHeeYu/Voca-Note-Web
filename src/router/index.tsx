import { createBrowserRouter } from 'react-router-dom'
import RequireAuth from '@/features/auth/components/RequireAuth'
import RouteError from '@/shared/components/RouteError'
import AppLayout from '@/app/layouts/AppLayout'
import LoadingState from '@/shared/components/LoadingState'

export const router = createBrowserRouter([
  {
    path: '/login',
    hydrateFallbackElement: <LoadingState />,
    errorElement: <RouteError />,
    lazy: async () => ({ Component: (await import('@/features/auth/pages/LoginPage')).default }),
  },
  {
    element: <RequireAuth />,
    hydrateFallbackElement: <LoadingState />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/home/pages/HomePage')).default,
            }),
          },
          {
            path: 'words',
            lazy: async () => ({
              Component: (await import('@/features/library/pages/LibraryPage')).default,
            }),
          },
          {
            path: 'words/new',
            lazy: async () => ({
              Component: (await import('@/features/editor/pages/WordEditorPage')).default,
            }),
          },
          {
            path: 'words/:wordId',
            lazy: async () => ({
              Component: (await import('@/features/editor/pages/WordEditorPage')).default,
            }),
          },
          {
            path: 'review',
            lazy: async () => ({
              Component: (await import('@/features/review/pages/ReviewPage')).default,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('@/features/settings/pages/SettingsPage')).default,
            }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <RouteError /> },
])
