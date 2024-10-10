import React, { useContext } from 'react';
import { NotificationContext } from '../../NotificationContext';
import './Notifications.css';

const Notifications: React.FC = () => {
  const { notifications } = useContext(NotificationContext);
  console.log(notifications);

  // Sort notifications by timestamp in descending order
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="notifications-container">
      <ul className="notifications-list">
        {sortedNotifications.map((notification) => (
          <li key={notification.id} className="notification-item">
            <div className="notification-content">
              <span className="notification-plant-machine">
                <strong>Plant ID:</strong> {notification.plantId} | <strong>Machine ID:</strong> {notification.machineId}
              </span>
              <span className="notification-parameters">
                <strong>Exceeded Parameters:</strong> {notification.parameters.map(param => param.parameter).join(', ')}
              </span>
              <span className="notification-timestamp">
                {new Date(notification.timestamp).toLocaleString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;
