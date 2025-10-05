import { useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook to continuously track and update user location
 * @param {number} interval - Update interval in milliseconds (default: 60000 = 1 minute)
 */
const useLocationTracker = (interval = 60000) => {
  const updateLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const token = localStorage.getItem('token');
          if (!token) return;

          await axios.post(
            'http://localhost:5000/api/users/update-location',
            { latitude, longitude },
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );

          console.log('Location updated:', { latitude, longitude });
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
        maximumAge: 30000
      }
    );
  }, []);

  useEffect(() => {
    // Update location immediately on mount
    updateLocation();

    // Set up interval for periodic updates
    const intervalId = setInterval(updateLocation, interval);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [updateLocation, interval]);

  return { updateLocation };
};

export default useLocationTracker;