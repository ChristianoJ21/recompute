import { Link } from 'react-router'
import { primaryButton } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-gray-600">This address is not part of the ReCompute demo.</p>
      <Link to="/" className={`${primaryButton} mt-6`}>
        Go to the fleet
      </Link>
    </div>
  )
}
