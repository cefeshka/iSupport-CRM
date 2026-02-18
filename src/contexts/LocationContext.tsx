import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Location {
  id: number;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

interface LocationContextType {
  locations: Location[];
  currentLocation: Location | null;
  setCurrentLocation: (location: Location) => void;
  loading: boolean;
  canSwitchLocation: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocationState] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile, isAdmin } = useAuth();

  const canSwitchLocation = isAdmin() || profile?.role === 'owner' || profile?.role === 'manager';

  useEffect(() => {
    if (profile) {
      loadLocations();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadLocations() {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setLocations(data);

        if (profile?.location_id) {
          const userLocation = data.find(loc => loc.id === profile.location_id);
          if (userLocation) {
            setCurrentLocationState(userLocation);
            localStorage.setItem('selectedLocationId', userLocation.id.toString());
            setLoading(false);
            return;
          }
        }

        if (canSwitchLocation) {
          const savedLocationId = localStorage.getItem('selectedLocationId');
          const savedLocation = savedLocationId
            ? data.find(loc => loc.id === parseInt(savedLocationId))
            : null;

          setCurrentLocationState(savedLocation || data[0]);
        } else {
          setCurrentLocationState(data[0]);
        }
      } else {
        console.warn('No locations found in database');
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  }

  function setCurrentLocation(location: Location) {
    if (!canSwitchLocation) {
      console.warn('User does not have permission to switch locations');
      return;
    }

    setCurrentLocationState(location);
    localStorage.setItem('selectedLocationId', location.id.toString());
  }

  return (
    <LocationContext.Provider
      value={{
        locations,
        currentLocation,
        setCurrentLocation,
        loading,
        canSwitchLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
