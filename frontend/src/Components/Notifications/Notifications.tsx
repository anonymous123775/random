// import React, { useContext, useState, useEffect } from 'react';
// import { NotificationContext } from '../../NotificationContext';
// import './Notifications.css';

// const Notifications: React.FC = () => {
//   const { notifications } = useContext(NotificationContext);
//   const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
//   const [filteredNotifications, setFilteredNotifications] = useState(notifications);

//   useEffect(() => {
//     // Filter notifications based on selected severity
//     if (selectedSeverity === 'all') {
//       setFilteredNotifications(notifications);
//     } else {
//       setFilteredNotifications(
//         notifications.filter((notification) => notification.severity === selectedSeverity)
//       );
//     }
//   }, [selectedSeverity, notifications]);

//   // Sort filtered notifications by timestamp in descending order
//   const sortedNotifications = [...filteredNotifications].sort(
//     (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
//   );

//   return (
//     <div className="notifications-container">
//       {/* Filter dropdown */}
//       <div className="filter-container">
//         <label htmlFor="severity-filter">Filter by Severity: </label>
//         <select
//           id="severity-filter"
//           value={selectedSeverity}
//           onChange={(e) => setSelectedSeverity(e.target.value)}
//         >
//           <option value="all">All</option>
//           <option value="warning">Warning</option>
//           <option value="error">Error</option>
//           <option value="info">Info</option>
//         </select>
//       </div>

//       {/* Notifications list */}
//       <ul className="notifications-list">
//         {sortedNotifications.map((notification) => (
//           <li key={notification.id} className={`notification-item notification-${notification.severity}`}>
//             <div className="notification-content">
//               <span className="notification-plant-machine">
//                 <strong>Plant ID:</strong> {notification.plantId} | <strong>Machine ID:</strong> {notification.machineId}
//               </span>
//               <span className="notification-parameters">
//                 <strong>Exceeded Parameters:</strong> {notification.parameters.map(param => param.parameter).join(', ')}
//               </span>
//               <span>
//                 <strong>{notification.severity}</strong> 
//               </span>
//               <span className="notification-timestamp">
//                 {new Date(notification.timestamp).toLocaleString()}
//               </span>
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// export default Notifications;


import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from 'material-react-table';
import moment from 'moment';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { NotificationContext } from '../../NotificationContext';
import './Notifications.css';

interface Notification {
  id: string;
  plantId: string;
  machineId: string;
  parameters: { parameter: string }[];
  severity: string;
  timestamp: string;
}

const cityNames = ['New York', 'Tokyo', 'London', 'Paris', 'Sydney', 'Dubai', 'Toronto', 'Berlin', 'Singapore', 'Rio de Janeiro'];
const machineNames = ['Allen-Bradley', 'FactoryTalk', 'PowerFlex', 'ControlLogix', 'CompactLogix', 'MicroLogix', 'GuardLogix', 'PanelView', 'Kinetix', 'Stratix'];


const NotificationsTable: React.FC = () => {
  const { notifications } = useContext(NotificationContext);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>(notifications);

  useEffect(() => {
    if (selectedSeverity === 'all') {
      setFilteredNotifications(notifications);
    } else {
      setFilteredNotifications(
        notifications.filter((notification) => notification.severity === selectedSeverity)
      );
    }
    console.log("filtered notifications : ",notifications)
  }, [selectedSeverity, notifications]);

  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [filteredNotifications]);

  const columns = useMemo<MRT_ColumnDef<Notification>[]>(
    () => [
      {
        accessorKey: 'plantId',
        header: 'Plant Name',
        size: 50,
        Cell: ({ cell }) => cityNames[Number(cell.getValue()) - 1 % cityNames.length], 
        filterFn: (row, id, filterValue) => cityNames[Number(row.getValue(id)) - 1].startsWith(filterValue),

      },
      {
        accessorKey: 'machineId',
        header: 'Machine Name',
        size: 50,
        Cell: ({ cell }) => machineNames[Number(cell.getValue()) - 1 % machineNames.length], 
        filterFn: (row, id, filterValue) => machineNames[Number(row.getValue(id)) - 1].startsWith(filterValue),
      },
      {
        accessorKey: 'parameters',
        header: 'Exceeded Parameters',
        size: 50 ,
        Cell: ({ cell }) => {
          const parameters = cell.getValue() as { parameter: string }[];
          return parameters ? parameters.map(param => param.parameter).join(', ') : 'N/A';
        },
      },
      {
        accessorKey: 'messages',
        header: 'Message',
        size: 300,
        Cell: ({ cell }) => {
          const threshold = cell.getValue() as { parameter: string }[];
          return threshold ? threshold.map(param => param).join(', ') : 'N/A';
        },
      },
      {
        accessorKey: 'severity',
        header: 'Severity',
        size: 50,
        Cell: ({ cell }) => {
          const severity = cell.getValue() as string;
          return <span className={`notification-${severity}`}>{severity}</span>;
        },
      },
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        size: 100,
        Cell: ({ cell }) => {
          const timestamp = cell.getValue() as string;
          return moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: sortedNotifications,
  });

  const theme = createTheme({
    typography: {
      fontFamily: 'Montserrat, Open Sans, Arial',
      fontSize: 14,
    },
    components: {
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '1.3rem',
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="notifications-container">
        {/* Filter dropdown */}
        <div className="filter-container">
          <label htmlFor="severity-filter" className="filter-label">Filter by Severity: </label>
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
        <MaterialReactTable table={table} />
      </div>
    </ThemeProvider>
  );
};

export default NotificationsTable;
