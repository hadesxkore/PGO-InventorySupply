import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, getDocs, limit, deleteDoc, setDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { toast } from 'sonner';

const SuppliesContext = createContext();

export function SuppliesProvider({ children }) {
  const [allSupplies, setAllSupplies] = useState([]);
  const [units, setUnits] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cache for next IDs
  const [clusterIdCache, setClusterIdCache] = useState({});

  // Function to get next ID from cache or Firestore
  const getNextIdForClusterCached = async (cluster) => {
    // If we have a cached next ID for this cluster, use it
    if (clusterIdCache[cluster]) {
      const nextId = clusterIdCache[cluster];
      // Update cache with next number
      const currentNumber = parseInt(nextId.split('-')[1]);
      setClusterIdCache(prev => ({
        ...prev,
        [cluster]: `${cluster}-${(currentNumber + 1).toString().padStart(4, '0')}`
      }));
      return nextId;
    }

    // If no cache, get from Firestore and cache next few numbers
    const suppliesRef = collection(db, "supplies");
    const q = query(
      suppliesRef,
      where("id", ">=", `${cluster}-`),
      where("id", "<=", `${cluster}-\uf8ff`),
      orderBy("id", "desc"),
      limit(1)
    );

    const snapshot = await getDocs(q);
    let nextNumber = 1;
    if (!snapshot.empty) {
      const lastId = snapshot.docs[0].data().id;
      nextNumber = parseInt(lastId.split('-')[1]) + 1;
    }

    // Cache next few IDs for this cluster
    const nextId = `${cluster}-${nextNumber.toString().padStart(4, '0')}`;
    setClusterIdCache(prev => ({
      ...prev,
      [cluster]: `${cluster}-${(nextNumber + 1).toString().padStart(4, '0')}`
    }));

    return nextId;
  };

  // Optimized update function
  const updateSupplyOptimized = async (id, updatedData) => {
    try {
      // Find supply in local state first
      const currentSupply = allSupplies.find(s => s.id === id);
      if (!currentSupply) throw new Error("Supply not found!");

      // If cluster is changing, get new ID from cache
      if (updatedData.cluster && currentSupply.cluster !== updatedData.cluster) {
        const newId = await getNextIdForClusterCached(updatedData.cluster);
        
        const updatedSupplyData = {
          ...currentSupply,
          ...updatedData,
          id: newId,
          dateUpdated: new Date(),
          name: updatedData.name || currentSupply.name,
          quantity: updatedData.quantity ?? currentSupply.quantity,
          unit: updatedData.unit || currentSupply.unit,
          cluster: updatedData.cluster,
          classification: updatedData.classification || currentSupply.classification || 'N/A',
          image: updatedData.image || currentSupply.image || '',
          availability: updatedData.availability ?? updatedData.quantity ?? currentSupply.quantity
        };

        // Update Firestore
        const newSupplyRef = doc(db, "supplies", newId);
        await setDoc(newSupplyRef, updatedSupplyData);
        await deleteDoc(doc(db, "supplies", id));

        // Update local state
        setAllSupplies(prev => [
          ...prev.filter(s => s.id !== id),
          updatedSupplyData
        ]);

        return newId;
      } else {
        // Regular update without cluster change
        const updatedSupplyData = {
          ...currentSupply,
          ...updatedData,
          dateUpdated: new Date()
        };

        // Update Firestore
        await updateDoc(doc(db, "supplies", id), updatedSupplyData);

        // Update local state
        setAllSupplies(prev => prev.map(s => 
          s.id === id ? updatedSupplyData : s
        ));

        return id;
      }
    } catch (error) {
      console.error("Error in optimized supply update:", error);
      throw error;
    }
  };

  // Fetch all data once when the app starts
  useEffect(() => {
    setIsLoading(true);

    // Fetch supplies
    const suppliesQuery = query(collection(db, "supplies"), orderBy("id", "desc"));
    const unsubscribeSupplies = onSnapshot(suppliesQuery, (snapshot) => {
      const suppliesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllSupplies(suppliesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching supplies:", error);
      toast.error("Failed to fetch supplies");
      setIsLoading(false);
    });

    // Fetch units
    const unitsQuery = query(collection(db, "units"), orderBy("name"));
    const unsubscribeUnits = onSnapshot(unitsQuery, (snapshot) => {
      const unitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnits(unitsData);
    }, (error) => {
      console.error("Error fetching units:", error);
      toast.error("Failed to fetch units");
    });

    // Fetch classifications
    const classificationsQuery = query(collection(db, "classifications"), orderBy("name"));
    const unsubscribeClassifications = onSnapshot(classificationsQuery, (snapshot) => {
      const classificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClassifications(classificationsData);
    }, (error) => {
      console.error("Error fetching classifications:", error);
      toast.error("Failed to fetch classifications");
    });

    // Cleanup function to unsubscribe from all listeners
    return () => {
      unsubscribeSupplies();
      unsubscribeUnits();
      unsubscribeClassifications();
    };
  }, []); // Empty dependency array means this runs once when the app starts

  const value = {
    allSupplies,
    units,
    classifications,
    isLoading,
    updateSupplyOptimized  // Add this to the context value
  };

  return (
    <SuppliesContext.Provider value={value}>
      {children}
    </SuppliesContext.Provider>
  );
}

export function useSupplies() {
  const context = useContext(SuppliesContext);
  if (context === undefined) {
    throw new Error('useSupplies must be used within a SuppliesProvider');
  }
  return context;
} 