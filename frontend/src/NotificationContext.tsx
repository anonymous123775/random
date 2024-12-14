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
  severity: string;
}

interface GroupedNotification {
  id: string;
  plantId: string;
  machineId: string;
  messages: string[];
  parameters: { parameter: string; threshold: string }[];
  timestamp: string;
  severity: string; 
}

interface NotificationContextProps {
  notifications: GroupedNotification[];
  setSeverityFilter: (severity: string) => void; 
}

export const NotificationContext = createContext<NotificationContextProps>({
  notifications: [],
  setSeverityFilter: () => {},
});

interface NotificationProviderProps {
  children: ReactNode;
}

const cityNames = ['New York', 'Tokyo', 'London', 'Paris', 'Sydney', 'Dubai', 'Toronto', 'Berlin', 'Singapore', 'Rio de Janeiro'];
const machineNames = ['Allen-Bradley', 'FactoryTalk', 'PowerFlex', 'ControlLogix', 'CompactLogix', 'MicroLogix', 'GuardLogix', 'PanelView', 'Kinetix', 'Stratix'];

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>(''); 

  useEffect(() => {
    const fetchNotifications = async () => {
      const data: Notification[] = await fetchNotificationsTyped();
      const grouped = groupNotificationsByPlantAndMachine(data);
      setGroupedNotifications(grouped);
    };

    fetchNotifications();

    const socket = new WebSocket(`ws://localhost:8000/ws/notification-stream`);

    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const notification: Notification = data.notification;

      const { plant_id, machine_id, parameter, severity } = notification;

      if (severity === "error") {
        toast.error(`Machine Offline: Plant Name ${cityNames[Number(plant_id)-1 % cityNames.length ]}, Machine Name ${machineNames[Number(machine_id)-1 % machineNames.length]} - ${parameter} is offline!`);
      } else if (severity === "info") {
        toast.info(`Machine Online: Plant Name ${cityNames[Number(plant_id)-1 % cityNames.length ]}, Machine Name ${machineNames[Number(machine_id)-1 % machineNames.length]} - ${parameter} is back online.`);
      }

      setRawNotifications((prev) => {
        const updatedNotifications = [notification, ...prev];
        const grouped = groupNotificationsByPlantAndMachine(updatedNotifications);
        setGroupedNotifications(grouped);
        return updatedNotifications;
      });
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
      severity: group.severity, 
    }));
  };

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
