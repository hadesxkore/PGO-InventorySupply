import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

const ReportsContext = createContext();

export function ReportsProvider({ children }) {
  const [reportsData, setReportsData] = useState({
    supplies: [],
    deliveries: [],
    releases: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  // Fetch reports data
  useEffect(() => {
    setIsLoading(true);
    console.log('ReportsContext: Starting data fetch with date range:', dateRange);

    const startDate = Timestamp.fromDate(dateRange.from);
    const endDate = Timestamp.fromDate(dateRange.to);

    // Helper function to transform document data
    const transformData = (doc, type) => {
      const baseData = {
        ID: doc.id,
        Classification: doc.data().classification || 'N/A',
        Quantity: doc.data().quantity || 0,
      };

      switch (type) {
        case 'supplies':
          return {
            ...baseData,
            Name: doc.data().name || '-',
            Unit: doc.data().unit || 'pcs',
            Cluster: doc.data().cluster || '-',
            "Date Added": doc.data().createdAt?.toDate().toLocaleString() || '-'
          };
        case 'deliveries':
          return {
            ...baseData,
            "Supply Name": doc.data().supplyName || '-',
            "Delivered By": doc.data().deliveredBy || '-',
            Notes: doc.data().notes || '-',
            "Date & Time": doc.data().createdAt?.toDate().toLocaleString() || '-'
          };
        case 'releases':
          return {
            ...baseData,
            "Supply Name": doc.data().supplyName || '-',
            "Received By": doc.data().receivedBy || '-',
            Department: doc.data().department || '-',
            Purpose: doc.data().purpose || '-',
            "Date Released": doc.data().createdAt?.toDate().toLocaleString() || '-'
          };
        default:
          return baseData;
      }
    };

    // Create queries for each collection
    const collections = ['supplies', 'deliveries', 'releases'];
    const unsubscribers = [];

    collections.forEach(collectionName => {
      console.log(`ReportsContext: Setting up listener for ${collectionName}`);
      
      const q = query(
        collection(db, collectionName),
        where("createdAt", ">=", startDate),
        where("createdAt", "<=", endDate),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => transformData(doc, collectionName));
        console.log(`ReportsContext: Received ${data.length} ${collectionName} records`);
        
        setReportsData(prev => {
          const updated = {
            ...prev,
            [collectionName]: data
          };
          console.log('ReportsContext: Updated data state:', {
            collectionName,
            totalItems: Object.values(updated).reduce((sum, arr) => sum + arr.length, 0)
          });
          return updated;
        });
        setIsLoading(false);
      }, (error) => {
        console.error(`Error fetching ${collectionName}:`, error);
        toast.error(`Failed to fetch ${collectionName}`);
        setIsLoading(false);
      });

      unsubscribers.push(unsubscribe);
    });

    // Cleanup function
    return () => {
      console.log('ReportsContext: Cleaning up listeners');
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [dateRange]);

  const value = {
    reportsData,
    isLoading,
    dateRange,
    setDateRange
  };

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
} 