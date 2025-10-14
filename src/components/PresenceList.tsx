import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToPresence, UserPresence } from '../firebase/db';
import { generateUserColor } from '../utils/colorUtils';
import '../styles/presence.css';

interface PresenceListProps {
  canvasId: string;
}

const PresenceList: React.FC<PresenceListProps> = ({ canvasId }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<{ [uid: string]: UserPresence }>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user || !canvasId) return;

    const userColor = generateUserColor(user.uid);
    const unsubscribe = subscribeToPresence(
      canvasId,
      user,
      userColor,
      (users) => {
        // Filter out stale users (inactive for more than 30 seconds)
        const now = Date.now();
        const activeUsers = Object.fromEntries(
          Object.entries(users).filter(([, userData]) => {
            return now - userData.lastSeen < 30000; // 30 seconds
          })
        );
        setOnlineUsers(activeUsers);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, canvasId]);

  const onlineUsersList = Object.values(onlineUsers);
  const otherUsers = onlineUsersList.filter(u => u.uid !== user?.uid);

  if (!user || onlineUsersList.length <= 1) {
    return null;
  }

  return (
    <div className={`presence-list ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="presence-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>Online Users ({onlineUsersList.length})</h3>
        <button className="collapse-btn">
          {isCollapsed ? '▲' : '▼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="presence-users">
          {/* Current user */}
          <div className="presence-user current-user">
            <div 
              className="user-avatar"
              style={{ backgroundColor: generateUserColor(user.uid) }}
            >
              {(user.displayName || `User ${user.uid.slice(0, 6)}`)[0].toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">
                {user.displayName || `User ${user.uid.slice(0, 6)}`} (You)
              </span>
              {user.isAnonymous && <span className="user-type">Guest</span>}
            </div>
          </div>
          
          {/* Other users */}
          {otherUsers.map((userData) => (
            <div key={userData.uid} className="presence-user">
              <div 
                className="user-avatar"
                style={{ backgroundColor: userData.color }}
              >
                {(userData.displayName || `User ${userData.uid.slice(0, 6)}`)[0].toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">
                  {userData.displayName || `User ${userData.uid.slice(0, 6)}`}
                </span>
                <span className="user-status">Online</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PresenceList;
