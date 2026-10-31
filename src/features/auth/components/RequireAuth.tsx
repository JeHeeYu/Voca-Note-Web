import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import LoadingState from '@/shared/components/LoadingState'
export default function RequireAuth() {
  const { user, ready, demo } = useAuthStore()
  if (!ready) return <LoadingState />
  return user || demo ? <Outlet /> : <Navigate to="/login" replace />
}
