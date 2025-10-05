import { useEffect } from 'react';
import axios from 'axios';

const useLocationTracker = (interval = 60000) => {
  useEffect(() => {
    const updateLocation = () => {
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const token = localStorage.getItem('token');
            if (!token) return;

            await axios.post(
              'http://localhost:5000/api/users/update-location',
              {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              },
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
          } catch (error) {
            console.error('Error updating location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Update immediately
    updateLocation();

    // Then update at regular intervals
    const intervalId = setInterval(updateLocation, interval);

    return () => clearInterval(intervalId);
  }, [interval]);
};

export default useLocationTracker;