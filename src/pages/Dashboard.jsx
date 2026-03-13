import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Este componente redirige a /dashboard/panel
export default function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/dashboard/panel', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Redirigiendo al panel...</p>
      </div>
    </div>
  )
}
