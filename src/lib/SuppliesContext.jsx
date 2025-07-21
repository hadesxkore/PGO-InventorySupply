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

  // Function to find the lowest available ID for a cluster
  const findLowestAvailableId = async (cluster) => {
    try {
      // Get all supplies for this cluster
      const suppliesRef = collection(db, "supplies");
      const q = query(
        suppliesRef,
        where("id", ">=", `${cluster}-`),
        where("id", "<=", `${cluster}-\uf8ff`),
        orderBy("id", "asc")
      );

      const snapshot = await getDocs(q);
      const existingIds = snapshot.docs.map(doc => {
        const id = doc.data().id;
        return parseInt(id.split('-')[1]);
      });

      // If no IDs exist, start with 1
      if (existingIds.length === 0) {
        return `${cluster}-${String(1).padStart(4, '0')}`;
      }

      // Find the first gap in the sequence
      let expectedNumber = 1;
      for (const actualNumber of existingIds) {
        if (actualNumber !== expectedNumber) {
          // We found a gap
          return `${cluster}-${String(expectedNumber).padStart(4, '0')}`;
        }
        expectedNumber++;
      }

      // If no gaps found, use the next number
      return `${cluster}-${String(expectedNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error("Error finding lowest available ID:", error);
      throw error;
    }
  };

  // Delete supply function
  const deleteSupplyOptimized = async (supplyId) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "supplies", supplyId));
      
      // Update local state
      setAllSupplies(prev => prev.filter(supply => supply.id !== supplyId));
      
      return true;
    } catch (error) {
      console.error("Error deleting supply:", error);
      throw error;
    }
  };

  // Optimized update function
  const updateSupplyOptimized = async (id, updatedData) => {
    try {
      // Find supply in local state first
      const currentSupply = allSupplies.find(s => s.id === id);
      if (!currentSupply) throw new Error("Supply not found!");

      // If cluster is changing, get new ID
      if (updatedData.cluster && currentSupply.cluster !== updatedData.cluster) {
        const newId = await findLowestAvailableId(updatedData.cluster);
        
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

  // Add supply function with optimized ID generation
  const addSupplyOptimized = async (supplyData) => {
    try {
      const { cluster } = supplyData;
      if (!cluster) throw new Error("Cluster is required");

      // Find the lowest available ID for this cluster
      const newId = await findLowestAvailableId(cluster);

      const newSupplyData = {
        ...supplyData,
        id: newId,
        dateAdded: new Date(),
        dateUpdated: new Date(),
        availability: supplyData.quantity
      };

      // Add to Firestore
      await setDoc(doc(db, "supplies", newId), newSupplyData);

      // Local state will be updated by the onSnapshot listener
      return newId;
    } catch (error) {
      console.error("Error adding supply:", error);
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
    updateSupplyOptimized,
    deleteSupplyOptimized,
    addSupplyOptimized
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