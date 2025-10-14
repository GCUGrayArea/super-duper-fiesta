interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

/**
 * Loading overlay component for blocking interactions during async operations
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  message = 'Loading...' 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="text-gray-700">{message}</span>
        </div>
      </div>
    </div>
  );
};
