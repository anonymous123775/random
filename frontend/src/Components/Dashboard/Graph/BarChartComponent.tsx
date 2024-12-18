import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Paper, CircularProgress, Checkbox, ListItemText } from '@mui/material';
import { fetchNumFailures } from '../../Services/api';
import { Data } from 'plotly.js'; // Import the Data type from Plotly

interface BarChartComponentProps {
  machineIds: string[];
  plantId: string;
}
const machineNames = ['Allen-Bradley', 'FactoryTalk', 'PowerFlex', 'ControlLogix', 'CompactLogix', 'MicroLogix', 'GuardLogix', 'PanelView', 'Kinetix', 'Stratix'];

const BarChartComponent: React.FC<BarChartComponentProps> = ({ machineIds, plantId }) => {
  const [data, setData] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);

  const handleMonthChange = (event: SelectChangeEvent<number>) => {
    setSelectedMonth(event.target.value as number);
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(event.target.value as number);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // console.log("Bar Chart Data fetched")
        const allData = await Promise.all(
          machineIds.map(id => fetchNumFailures(selectedMonth, selectedYear, id, plantId))
        );

        const combinedData = allData.reduce((acc, curr, index) => {
          if (Array.isArray(curr)) {
            curr.forEach((item: any) => {
              const existing = acc.find((d: any) => d.day === item.day);
              if (existing) {
                existing[`failures_${index}`] = item.failures;
              } else {
                acc.push({ day: item.day, [`failures_${index}`]: item.failures });
              }
            });
          } else {
            console.error("Unexpected data format:", curr);
          }
          return acc;
        }, []);

        setData(combinedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, machineIds, plantId]);

  // console.log("machine ids i barchart : ",machineIds)
  const traces: Data[] = machineIds.map((id, index) => ({
    x: data.map(item => item.day),
    y: data.map(item => item[`failures_${index}`] || 0),
    type: 'bar',
    name: machineNames[Number(id) - 1 % machineNames.length],
    hoverinfo: 'x+y',
    hovertemplate: `${machineNames[Number(id) - 1 % machineNames.length]}<br>Day: %{x}<br>Failures: %{y}<extra></extra>`,
  }));

  return (
    <Paper elevation={3} sx={{ padding: 2, marginBottom: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl variant="outlined" size="small">
            <InputLabel id="month-select-label">Month</InputLabel>
            <Select
              labelId="month-select-label"
              value={selectedMonth}
              onChange={handleMonthChange}
              label="Month"
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 224,
                    width: 250,
                  },
                },
              }}
            >
              {Array.from(Array(12).keys()).map((month) => (
                <MenuItem key={month + 1} value={month + 1}>
                  {new Date(0, month).toLocaleString('default', { month: 'long' })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" size="small">
            <InputLabel id="year-select-label">Year</InputLabel>
            <Select
              labelId="year-select-label"
              value={selectedYear}
              onChange={handleYearChange}
              label="Year"
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 224,
                    width: 250,
                  },
                },
              }}
            >
              {Array.from(Array(10).keys()).map((year) => (
                <MenuItem key={year + 2020} value={year + 2020}>
                  {year + 2020}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <CircularProgress />
        </Box>
      ) : (
        <Plot
          data={traces}
          layout={{
            title: 'Failures per Day',
            xaxis: { title: 'Day' },
            yaxis: { title: 'Failures' },
            autosize: true,
            barmode: 'group',
            showlegend: true,
            legend: {
              x: 1,
              y: 1,
              bgcolor: 'rgba(255, 255, 255, 0.5)',
              bordercolor: 'rgba(0, 0, 0, 0.5)',
              borderwidth: 1,
            },
            margin: { t: 40, b: 80, l: 40, r: 40 }
          }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </Paper>
  );
};

export default BarChartComponent;
