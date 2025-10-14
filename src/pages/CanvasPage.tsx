import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/authSlice';

/**
 * Main canvas application page (protected route)
 * Will be enhanced with actual canvas in Phase 3
 */
export const CanvasPage: React.FC = () => {
  const user = useAppSelector(selectUser);

  // Use display name if available, otherwise use email address
  const displayName = user?.displayName || user?.email || 'Unknown User';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header/Toolbar placeholder */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Collab Canvas
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {displayName}
              </span>
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: user?.color || '#6b7280' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <Link 
                to="/logout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main canvas area placeholder */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Canvas Coming Soon
                </h3>
                <p className="text-gray-500">
                  Phase 3 will implement the collaborative canvas here
                </p>
                <div className="mt-4 text-sm text-gray-400">
                  <p>User: {user?.email}</p>
                  <p>Color: <span style={{ color: user?.color }}>{user?.color}</span></p>
                  <p>UID: {user?.uid.slice(0, 8)}...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
