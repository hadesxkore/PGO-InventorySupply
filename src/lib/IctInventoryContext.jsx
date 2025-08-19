import { createContext, useContext, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const IctInventoryContext = createContext();

export function useIctInventory() {
  return useContext(IctInventoryContext);
}

export function IctInventoryProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add new device
  const addDevice = async (deviceData) => {
    try {
      setLoading(true);
      setError(null);
      
      const docRef = await addDoc(collection(db, "ict_inventory"), {
        ...deviceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return docRef.id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get all devices
  const getDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const q = query(
        collection(db, "ict_inventory"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update device
  const updateDevice = async (deviceId, deviceData) => {
    try {
      setLoading(true);
      setError(null);
      
      const deviceRef = doc(db, "ict_inventory", deviceId);
      await updateDoc(deviceRef, {
        ...deviceData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete device
  const deleteDevice = async (deviceId) => {
    try {
      setLoading(true);
      setError(null);
      
      await deleteDoc(doc(db, "ict_inventory", deviceId));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    loading,
    error,
    addDevice,
    getDevices,
    updateDevice,
    deleteDevice,
  };

  return (
    <IctInventoryContext.Provider value={value}>
      {children}
    </IctInventoryContext.Provider>
  );
}
