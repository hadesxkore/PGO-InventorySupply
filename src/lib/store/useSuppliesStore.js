import { create } from 'zustand';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where,
  limit,
} from "firebase/firestore";

const useSuppliesStore = create((set, get) => ({
  supplies: [],
  units: [],
  classifications: [],
  loading: false,
  error: null,
  
  // Fetch all supplies
  fetchSupplies: async () => {
    try {
      set({ loading: true, error: null });
      const q = query(
        collection(db, "supplies"),
        orderBy("dateAdded", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const suppliesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        docId: doc.id,
        ...doc.data()
      }));
      
      set({ supplies: suppliesList, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Fetch units
  fetchUnits: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "units"));
      const unitsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ units: unitsList });
    } catch (error) {
      console.error("Error fetching units:", error);
    }
  },

  // Fetch classifications
  fetchClassifications: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "classifications"));
      const classificationsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ classifications: classificationsList });
    } catch (error) {
      console.error("Error fetching classifications:", error);
    }
  },

  // Add new supply
  addSupply: async (supplyData) => {
    try {
      set({ loading: true, error: null });

      // Get the latest ID for the cluster
      const clusterQuery = query(
        collection(db, "supplies"),
        where("cluster", "==", supplyData.cluster),
        orderBy("id", "desc"),
        limit(1)
      );
      
      const clusterSnapshot = await getDocs(clusterQuery);
      let nextNumber = 1;
      
      if (!clusterSnapshot.empty) {
        const latestId = clusterSnapshot.docs[0].data().id;
        const currentNumber = parseInt(latestId.split('-')[1]);
        nextNumber = currentNumber + 1;
      }

      // Generate the new ID
      const newId = `${supplyData.cluster}-${String(nextNumber).padStart(3, '0')}`;
      
      const docRef = await addDoc(collection(db, "supplies"), {
        ...supplyData,
        id: newId,
        dateAdded: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update local state optimistically
      const newSupply = {
        id: newId,
        docId: docRef.id,
        ...supplyData,
        dateAdded: new Date(),
        updatedAt: new Date(),
      };

      set(state => ({
        supplies: [newSupply, ...state.supplies],
        loading: false
      }));
      
      return docRef.id;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update supply
  updateSupply: async (supplyId, supplyData) => {
    try {
      set({ loading: true, error: null });
      
      const supplyRef = doc(db, "supplies", supplyId);
      await updateDoc(supplyRef, {
        ...supplyData,
        updatedAt: serverTimestamp(),
      });

      // Update local state immediately
      set(state => ({
        supplies: state.supplies.map(supply => 
          supply.docId === supplyId 
            ? { ...supply, ...supplyData, updatedAt: new Date() }
            : supply
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete supply
  deleteSupply: async (supplyId) => {
    try {
      set({ loading: true, error: null });
      
      await deleteDoc(doc(db, "supplies", supplyId));

      // Update local state immediately
      set(state => ({
        supplies: state.supplies.filter(supply => supply.docId !== supplyId),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Add new unit
  addUnit: async (unitName) => {
    try {
      const docRef = await addDoc(collection(db, "units"), { name: unitName });
      const newUnit = { id: docRef.id, name: unitName };
      set(state => ({ units: [...state.units, newUnit] }));
      return docRef.id;
    } catch (error) {
      console.error("Error adding unit:", error);
      throw error;
    }
  },

  // Add new classification
  addClassification: async (classificationName) => {
    try {
      const docRef = await addDoc(collection(db, "classifications"), { name: classificationName });
      const newClassification = { id: docRef.id, name: classificationName };
      set(state => ({ classifications: [...state.classifications, newClassification] }));
      return docRef.id;
    } catch (error) {
      console.error("Error adding classification:", error);
      throw error;
    }
  },

  // Search supplies
  searchSupplies: (searchTerm) => {
    const { supplies } = get();
    const searchLower = searchTerm.toLowerCase();
    
    return supplies.filter(supply => (
      supply.id.toLowerCase().includes(searchLower) ||
      supply.name.toLowerCase().includes(searchLower)
    ));
  },

  // Filter supplies by stock level
  filterByStock: (type) => {
    const { supplies } = get();
    switch (type) {
      case 'low':
        return supplies.filter(supply => supply.quantity > 0 && supply.quantity < 10);
      case 'out':
        return supplies.filter(supply => supply.quantity === 0);
      default:
        return supplies;
    }
  },

  // Sort supplies
  sortSupplies: (field, order) => {
    const { supplies } = get();
    return [...supplies].sort((a, b) => {
      let compareA, compareB;
      
      switch (field) {
        case 'id':
          compareA = parseInt(a.id.split('-')[1]);
          compareB = parseInt(b.id.split('-')[1]);
          break;
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'quantity':
          compareA = a.quantity;
          compareB = b.quantity;
          break;
        case 'availability':
          compareA = a.availability ?? a.quantity;
          compareB = b.availability ?? b.quantity;
          break;
        case 'classification':
          compareA = (a.classification || 'N/A').toLowerCase();
          compareB = (b.classification || 'N/A').toLowerCase();
          break;
        case 'dateAdded':
          compareA = a.dateAdded?.toDate().getTime() || 0;
          compareB = b.dateAdded?.toDate().getTime() || 0;
          break;
        default:
          compareA = a[field];
          compareB = b[field];
      }

      return order === 'asc' ? 
        (compareA > compareB ? 1 : -1) : 
        (compareA < compareB ? 1 : -1);
    });
  }
}));

export default useSuppliesStore;