import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Notification {
  id: number;
  plant_id: string;
  machine_id: string;
  parameter: string;
  status: string;
  threshold: string;
  timestamp: string;
}

interface GroupedNotification {
  id: string;
  plantId: string;
  machineId: string;
  messages: string[];
  parameters: { parameter: string; threshold: string }[];
  timestamp: string;
}

interface NotificationContextProps {
  notifications: GroupedNotification[];
}

export const NotificationContext = createContext<NotificationContextProps>({ notifications: [] });

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const response = await fetch('http://localhost:8000/api/notifications');
      const data: Notification[] = await response.json();
      setRawNotifications(data);
      const grouped = groupNotificationsByPlantAndMachine(data);
      setGroupedNotifications(grouped);
      console.log(grouped);
    };

    fetchNotifications();

    const socket = new WebSocket(`ws://localhost:8000/ws/notification-stream`);

    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const notification: Notification = data.notification;
      console.log("new notification received: ", notification);
      
      // Ensure the fields are correctly accessed
      const { plant_id, machine_id, parameter } = notification;
    
      setRawNotifications((prev) => {
        const updatedNotifications = [notification, ...prev];
        const grouped = groupNotificationsByPlantAndMachine(updatedNotifications);
        setGroupedNotifications(grouped);
        return updatedNotifications;
      });
    
      console.log(notification);
      toast.info(`New Notification: Plant ID ${plant_id}, Machine ID ${machine_id} - ${parameter} exceeded threshold`);
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
      const { plant_id, machine_id, parameter, threshold, timestamp } = notification;
      const key = `${plant_id}-${machine_id}-${timestamp}`;
      if (!acc[key]) {
        acc[key] = { plantId: plant_id, machineId: machine_id, messages: [], parameters: [], timestamp };
      }
      acc[key].messages.push(`${parameter} exceeded threshold of ${threshold}`);
      acc[key].parameters.push({ parameter, threshold });
      return acc;
    }, {} as Record<string, { plantId: string; machineId: string; messages: string[]; parameters: { parameter: string; threshold: string }[]; timestamp: string }>);

    return Object.values(grouped).map(group => ({
      id: `${group.plantId}-${group.machineId}-${group.timestamp}`,
      plantId: group.plantId,
      machineId: group.machineId,
      messages: group.messages,
      parameters: group.parameters,
      timestamp: group.timestamp,
    }));
  };

  return (
    <NotificationContext.Provider value={{ notifications: groupedNotifications }}>
      {children}
      <ToastContainer />
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
