import React, { useState, useEffect } from 'react';

// Notification type
export interface Notification {
  id: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number; // in milliseconds, default 3000
}

// Props for the notification overlay component
interface NotificationOverlayProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

// Individual notification component
interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onDismiss 
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = notification.duration || 3000;
    
    // Start exit animation 300ms before dismissal
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    // Dismiss notification
    const dismissTimer = setTimeout(() => {
      onDismiss(notification.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [notification.id, notification.duration, onDismiss]);

  // Style based on notification type
  const getNotificationStyles = (type: string = 'info') => {
    const baseStyles = "px-4 py-3 rounded-lg shadow-lg max-w-md transition-all duration-300 ease-in-out";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-100 text-green-800 border border-green-200`;
      case 'warning':
        return `${baseStyles} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case 'error':
        return `${baseStyles} bg-red-100 text-red-800 border border-red-200`;
      default: // 'info'
        return `${baseStyles} bg-blue-100 text-blue-800 border border-blue-200`;
    }
  };

  return (
    <div
      className={`
        ${getNotificationStyles(notification.type)}
        ${!isExiting ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex-1">
          {notification.message}
        </p>
        <button
          onClick={() => onDismiss(notification.id)}
          className="ml-3 text-current opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss notification"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Main notification overlay component
export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem
            notification={notification}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (
    message: string, 
    type: Notification['type'] = 'info',
    duration: number = 3000
  ) => {
    const id = crypto.randomUUID();
    const notification: Notification = {
      id,
      message,
      type,
      duration,
    };

    setNotifications(prev => [...prev, notification]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
  };
}
