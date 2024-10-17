import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import moment from 'moment';
import { fetchHistoricalData } from '../../Services/api';
import debounce from 'lodash.debounce';

interface DataContextProps {
  data: any[];
  timeframe: string;
  setTimeframe: (timeframe: string) => void;
  loading: boolean;
}

const DataContext = createContext<DataContextProps | null>(null);

interface DataProviderProps {
  machineId: string[];
  plantId: string;
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ machineId, plantId, children }) => {
  const [data, setData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('5m');
  const [loading, setLoading] = useState<boolean>(true);
  const [cache, setCache] = useState<{ [key: string]: any[] }>({});

  const fetchData = useCallback(async () => {
    const cacheKey = `${machineId.join(',')}-${plantId}-${timeframe}`;
    if (cache[cacheKey]) {
      setData(cache[cacheKey]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const allData = await fetchHistoricalData(machineId, plantId, timeframe);
      const combinedData = allData.flat().map((item: any) => ({
        ...item,
        time: moment(item.time).valueOf(),
      }));
      const uniqueData = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
      setCache((prevCache) => ({ ...prevCache, [cacheKey]: uniqueData }));
      setData(uniqueData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  }, [machineId, plantId, timeframe, cache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8000/ws/data-stream?plantId=${plantId}`);

    socket.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      const filteredData = newData
        .filter((item: any) => machineId.includes(String(item.machine_id)))
        .map((item: any) => ({
          ...item,
          time: moment(item.time).valueOf(),
        }));

      setData((prevData) => {
        const combinedData = [...prevData, ...filteredData];
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.time, item])).values());
        return uniqueData;
      });
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    return () => {
      socket.close();
    };
  }, [machineId, plantId]);

  const debouncedSetTimeframe = useCallback(debounce(setTimeframe, 300), []);

  return (
    <DataContext.Provider value={{ data, timeframe, setTimeframe: debouncedSetTimeframe, loading }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
