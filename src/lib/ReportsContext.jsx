import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { useSupplies } from './SuppliesContext';

const ReportsContext = createContext();

export function ReportsProvider({ children }) {
  const { allSupplies } = useSupplies();
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

  // Transform supplies data whenever allSupplies changes
  useEffect(() => {
    const transformedSupplies = allSupplies.map(doc => ({
      ID: doc.id,
      Name: doc.name || '-',
      Classification: doc.classification || 'N/A',
      Quantity: doc.quantity || 0,
      Unit: doc.unit || 'pcs',
      Cluster: doc.cluster || '-',
      "Date Added": doc.dateAdded?.toDate().toLocaleString() || '-'
    }));

    setReportsData(prev => ({
      ...prev,
      supplies: transformedSupplies
    }));
  }, [allSupplies]);

  // Fetch reports data for deliveries and releases
  useEffect(() => {
    setIsLoading(true);
    console.log('ReportsContext: Starting data fetch with date range:', dateRange);

    const startDate = Timestamp.fromDate(new Date(dateRange.from.setHours(0, 0, 0, 0)));
    const endDate = Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999)));

    // Helper function to transform document data
    const transformData = (doc, type) => {
      const data = doc.data();
      const baseData = {
        ID: data.id || doc.id, // Use the custom ID if available, fallback to Firestore ID
        "Supply Name": data.supplyName || '-',
        Classification: data.classification || 'N/A',
        Quantity: data.quantity || 0,
        Unit: data.unit || 'pcs',
      };

      if (type === 'deliveries') {
        return {
          ...baseData,
          "Delivered By": data.deliveredBy || '-',
          Notes: data.notes || '-',
          "Date & Time": data.createdAt?.toDate().toLocaleString() || '-'
        };
      } else if (type === 'releases') {
        return {
          ...baseData,
          "Received By": data.receivedBy || '-',
          Department: data.department || '-',
          Purpose: data.purpose || '-',
          "Date Released": data.createdAt?.toDate().toLocaleString() || '-'
        };
      }

      return baseData;
    };

    // Create queries for deliveries and releases
    const collections = ['deliveries', 'releases'];
    const unsubscribers = [];

    collections.forEach(collectionName => {
      console.log(`ReportsContext: Setting up listener for ${collectionName} between ${startDate.toDate()} and ${endDate.toDate()}`);
      
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
            totalItems: data.length,
            dateRange: {
              from: startDate.toDate(),
              to: endDate.toDate()
            }
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