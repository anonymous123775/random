import React, { useContext, useState, useEffect } from 'react';
import { NotificationContext } from '../../NotificationContext';
import './Notifications.css';

const Notifications: React.FC = () => {
  const { notifications } = useContext(NotificationContext);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [filteredNotifications, setFilteredNotifications] = useState(notifications);

  useEffect(() => {
    // Filter notifications based on selected severity
    if (selectedSeverity === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(
        notifications.filter((notification) => notification.severity === selectedSeverity)
      );
    }
  }, [selectedSeverity, notifications]);

  // Sort filtered notifications by timestamp in descending order
  const sortedNotifications = [...filteredNotifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="notifications-container">
      {/* Filter dropdown */}
      <div className="filter-container">
        <label htmlFor="severity-filter">Filter by Severity: </label>
        <select
          id="severity-filter"
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
        >
          <option value="all">All</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Notifications list */}
      <ul className="notifications-list">
        {sortedNotifications.map((notification) => (
          <li key={notification.id} className={`notification-item notification-${notification.severity}`}>
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
              {/* <span className={`notification-severity ${notification.severity}`}>
                {notification.severity}
              </span> */}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Notifications;
