import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchNotificationsTyped } from './Components/Services/api';

interface Notification {
  id: number;
  plant_id: string;
  machine_id: string;
  parameter: string;
  status: string;
  threshold: string;
  timestamp: string;
  severity: string; // Include severity
}

interface GroupedNotification {
  id: string;
  plantId: string;
  machineId: string;
  messages: string[];
  parameters: { parameter: string; threshold: string }[];
  timestamp: string;
  severity: string; // Include severity
}

interface NotificationContextProps {
  notifications: GroupedNotification[];
  setSeverityFilter: (severity: string) => void; // Add filter setter
}

export const NotificationContext = createContext<NotificationContextProps>({
  notifications: [],
  setSeverityFilter: () => {}, // Default empty function
});

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>(''); // Add state for severity filter

  useEffect(() => {
    const fetchNotifications = async () => {
      const data: Notification[] = await fetchNotificationsTyped();
      // console.log(data);
      setRawNotifications(data);
      const grouped = groupNotificationsByPlantAndMachine(data);
      setGroupedNotifications(grouped);
      // console.log(grouped);
    };

    fetchNotifications();

    const socket = new WebSocket(`ws://localhost:8000/ws/notification-stream`);

    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const notification: Notification = data.notification;
      // console.log("new notification received: ", notification);

      // Ensure the fields are correctly accessed
      const { plant_id, machine_id, parameter, severity } = notification;

      // Show toast notifications only for severity "error" and "info"
      if (severity === "error") {
        toast.error(`Machine Offline: Plant ID ${plant_id}, Machine ID ${machine_id} - ${parameter} is offline!`);
      } else if (severity === "info") {
        toast.info(`Machine Online: Plant ID ${plant_id}, Machine ID ${machine_id} - ${parameter} is back online.`);
      }

      setRawNotifications((prev) => {
        const updatedNotifications = [notification, ...prev];
        const grouped = groupNotificationsByPlantAndMachine(updatedNotifications);
        setGroupedNotifications(grouped);
        return updatedNotifications;
      });

      // console.log(notification);
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    return () => {
      socket.close();
    };
  }, []);

  const groupNotificationsByPlantAndMachine = (notifications: Notification[]): GroupedNotification[] => {
    const grouped = notifications.reduce((acc, notification) => {
      const { plant_id, machine_id, parameter, threshold, timestamp, severity } = notification;
      const key = `${plant_id}-${machine_id}-${timestamp}`;
      if (!acc[key]) {
        acc[key] = { plantId: plant_id, machineId: machine_id, messages: [], parameters: [], timestamp, severity };
      }
      acc[key].messages.push(`${parameter} exceeded threshold of ${threshold}`);
      acc[key].parameters.push({ parameter, threshold });
      return acc;
    }, {} as Record<string, { plantId: string; machineId: string; messages: string[]; parameters: { parameter: string; threshold: string }[]; timestamp: string; severity: string }>);

    return Object.values(grouped).map(group => ({
      id: `${group.plantId}-${group.machineId}-${group.timestamp}`,
      plantId: group.plantId,
      machineId: group.machineId,
      messages: group.messages,
      parameters: group.parameters,
      timestamp: group.timestamp,
      severity: group.severity, // Include severity
    }));
  };

  // Apply filter based on severity
  const filteredNotifications = severityFilter
    ? groupedNotifications.filter((n) => n.severity === severityFilter)
    : groupedNotifications;

  return (
    <NotificationContext.Provider value={{ notifications: filteredNotifications, setSeverityFilter }}>
      {children}
      <ToastContainer style={{ marginTop: '50px' }}/>
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
