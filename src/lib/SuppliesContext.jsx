import { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, getDocs, limit, deleteDoc, setDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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
    // Get all existing IDs for this cluster
    const suppliesRef = collection(db, "supplies");
    const q = query(
      suppliesRef,
      where("id", ">=", `${cluster}-`),
      where("id", "<=", `${cluster}-\uf8ff`),
      orderBy("id", "asc")
    );

    const snapshot = await getDocs(q);
    const existingNumbers = new Set();
    
    snapshot.forEach(doc => {
      const num = parseInt(doc.data().id.split('-')[1]);
      existingNumbers.add(num);
    });

    // Find the first available number
    let nextNumber = 1;
    while (existingNumbers.has(nextNumber)) {
      nextNumber++;
    }

    const nextId = `${cluster}-${nextNumber.toString().padStart(4, '0')}`;
    return nextId;
  };

  // Optimized update function
  const updateSupplyOptimized = async (id, updatedData, docId) => {
    try {
      // Find supply in local state first
      const currentSupply = allSupplies.find(s => s.id === id);
      if (!currentSupply) throw new Error("Supply not found!");

      // Reference to the existing document
      const supplyRef = doc(db, "supplies", docId);

      // If cluster is changing, update the ID but keep the same document
      if (updatedData.cluster && currentSupply.cluster !== updatedData.cluster) {
        const newId = await getNextIdForClusterCached(updatedData.cluster);
        
        const updatedSupplyData = {
          ...currentSupply,
          ...updatedData,
          id: newId,
          dateUpdated: serverTimestamp(),
          name: updatedData.name || currentSupply.name,
          quantity: updatedData.quantity ?? currentSupply.quantity,
          unit: updatedData.unit || currentSupply.unit,
          cluster: updatedData.cluster,
          classification: updatedData.classification || currentSupply.classification || 'N/A',
          image: updatedData.image || currentSupply.image || '',
          availability: updatedData.availability ?? updatedData.quantity ?? currentSupply.quantity
        };

        // Update the existing document
        await updateDoc(supplyRef, updatedSupplyData);

        // Update local state
        setAllSupplies(prev => prev.map(s => 
          s.docId === docId ? { ...updatedSupplyData, docId } : s
        ));

        return newId;
      } else {
        // Regular update without cluster change
        const updatedSupplyData = {
          ...currentSupply,
          ...updatedData,
          dateUpdated: serverTimestamp()
        };

        // Update the existing document
        await updateDoc(supplyRef, updatedSupplyData);

        // Update local state
        setAllSupplies(prev => prev.map(s => 
          s.docId === docId ? { ...updatedSupplyData, docId } : s
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
    const suppliesQuery = query(collection(db, "supplies"), orderBy("dateAdded", "desc"));
    const unsubscribeSupplies = onSnapshot(suppliesQuery, (snapshot) => {
      const suppliesData = snapshot.docs.map(doc => ({
        docId: doc.id, // Store Firestore document ID
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
