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
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    if (profile) {
      loadLocations();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadLocations() {
    if (!profile) {
      console.log('No profile available, skipping location load');
      setLoading(false);
      return;
    }

    console.log('Loading locations for profile:', { role: profile.role, location_id: profile.location_id });

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error loading locations:', error);
      }

      console.log('Locations loaded:', data?.length || 0, 'locations');

      if (data && data.length > 0) {
        setLocations(data);

        const userCanSwitch = profile.role === 'admin' || profile.role === 'owner' || profile.role === 'manager';
        console.log('User can switch locations:', userCanSwitch);

        if (profile.location_id) {
          const userLocation = data.find(loc => loc.id === profile.location_id);
          if (userLocation) {
            console.log('Setting user location from profile:', userLocation.name);
            setCurrentLocationState(userLocation);
            localStorage.setItem('selectedLocationId', userLocation.id.toString());
            setLoading(false);
            return;
          } else {
            console.warn('Profile location_id not found in locations:', profile.location_id);
          }
        }

        if (userCanSwitch) {
          const savedLocationId = localStorage.getItem('selectedLocationId');
          const savedLocation = savedLocationId
            ? data.find(loc => loc.id === parseInt(savedLocationId))
            : null;

          const selectedLocation = savedLocation || data[0];
          console.log('Setting location for admin/manager:', selectedLocation.name);
          setCurrentLocationState(selectedLocation);
          if (!savedLocationId && data[0]) {
            localStorage.setItem('selectedLocationId', data[0].id.toString());
          }
        } else {
          console.log('Setting default location for non-admin:', data[0].name);
          setCurrentLocationState(data[0]);
          localStorage.setItem('selectedLocationId', data[0].id.toString());
        }
      } else {
        console.warn('No locations found in database. Please create at least one location.');
        setLocations([]);
        setCurrentLocationState(null);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      setLocations([]);
      setCurrentLocationState(null);
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
