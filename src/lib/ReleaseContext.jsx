import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

const ReleaseContext = createContext();

export function ReleaseProvider({ children }) {
  const [releases, setReleases] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReleases: 0,
    todayReleases: 0,
    uniqueRecipients: 0
  });

  // Fetch all data once when the app starts
  useEffect(() => {
    setIsLoading(true);
    console.log('ReleaseContext: Starting data fetch');

    // Fetch supplies for the dropdown
    const suppliesQuery = query(collection(db, "supplies"), orderBy("name"));
    const unsubscribeSupplies = onSnapshot(suppliesQuery, (snapshot) => {
      const suppliesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('ReleaseContext: Received supplies data:', suppliesData.length, 'items');
      setSupplies(suppliesData);
    }, (error) => {
      console.error("Error fetching supplies:", error);
      toast.error("Failed to fetch supplies");
    });

    // Fetch releases
    const releasesQuery = query(collection(db, "releases"), orderBy("createdAt", "desc"));
    const unsubscribeReleases = onSnapshot(releasesQuery, (snapshot) => {
      const releasesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('ReleaseContext: Received releases data:', releasesData.length, 'items');
      setReleases(releasesData);
      
      // Update stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const uniqueRecipients = new Set(releasesData.map(r => r.receivedBy)).size;
      
      setStats({
        totalReleases: releasesData.length,
        todayReleases: releasesData.filter(d => d.createdAt?.toDate().getTime() >= today).length,
        uniqueRecipients
      });

      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching releases:", error);
      toast.error("Failed to fetch releases");
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      console.log('ReleaseContext: Cleaning up listeners');
      unsubscribeSupplies();
      unsubscribeReleases();
    };
  }, []); // Empty dependency array means this runs once when the app starts

  const value = {
    releases,
    supplies,
    stats,
    isLoading
  };

  return (
    <ReleaseContext.Provider value={value}>
      {children}
    </ReleaseContext.Provider>
  );
}

export function useReleases() {
  const context = useContext(ReleaseContext);
  if (context === undefined) {
    throw new Error('useReleases must be used within a ReleaseProvider');
  }
  return context;
} 