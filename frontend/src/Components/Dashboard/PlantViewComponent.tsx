import React, { useEffect, useState } from 'react'
import { Container, Grid, Box, Button } from '@mui/material';
import WebSocketPieChartComponent from './MachineStatusDashboard';
import BarChartFailureComponent from './Graph/BarChartFailureComponent';
import { getPlantCount } from '../Services/api';

interface PlantViewInterace{
    plantId: string
}

const cityNames = ['New York', 'Tokyo', 'London', 'Paris', 'Sydney', 'Dubai', 'Toronto', 'Berlin', 'Singapore', 'Rio de Janeiro'];
const machineNames = ['Allen-Bradley', 'FactoryTalk', 'PowerFlex', 'ControlLogix', 'CompactLogix', 'MicroLogix', 'GuardLogix', 'PanelView', 'Kinetix', 'Stratix'];

const PlantViewComponent: React.FC<PlantViewInterace> = ({plantId}) => {
    const [plants, setPlants] = useState<string[]>([]);
    const [Loading, setLoading] = useState<boolean>(true);
    const [selectedPlant, setSelectedPlant] = useState<string>(plantId);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const plantList = await getPlantCount();
            setPlants(plantList.distinct_plant_count);
            setLoading(false);
        };

        fetchData();
    }, [selectedPlant]);

    const handlePlantChange = async (plantId: string) => {
        if (selectedPlant !== plantId) {
          setLoading(true);
          setSelectedPlant(plantId);
          setLoading(false);
        }
      };

    return (
        <>
            <Container>
                <Box display="flex" justifyContent="center" mb={2}>
                    {plants.map((plant, index) => (
                        <Button
                        key={plant}
                        variant={selectedPlant === plant ? 'contained' : 'outlined'}
                        color="primary"
                        onClick={() => handlePlantChange(plant)}
                        sx={{ margin: 0.5 }}
                        >
                        {/* Plant {plant} */}
                        {cityNames[Number(plant) - 1 % cityNames.length]}
                        </Button>
                    ))}
                </Box>
            </Container>
            <Grid container spacing={3}>
                {/* Plant View Components */}
                <Grid item xs={12}>
                    <WebSocketPieChartComponent selectedPlant={selectedPlant} loading={Loading} />
                </Grid>
                <Grid item xs={12}>
                    <BarChartFailureComponent selectedPlant={selectedPlant} />
                </Grid>
            </Grid>
        </>
    )
}

export default PlantViewComponent;