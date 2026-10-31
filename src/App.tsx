import { RouterProvider } from 'react-router-dom'
import AppProvider from '@/app/providers/AppProvider'
import { router } from '@/router'

export default function App() {
  return <AppProvider><RouterProvider router={router} /></AppProvider>
}
