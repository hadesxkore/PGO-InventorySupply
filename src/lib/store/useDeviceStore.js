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
} from "firebase/firestore";

const useDeviceStore = create((set, get) => ({
  devices: [],
  loading: false,
  error: null,
  
  // Fetch all devices
  fetchDevices: async () => {
    try {
      set({ loading: true, error: null });
      const q = query(
        collection(db, "ict_inventory"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const devicesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ devices: devicesList, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Add new device
  addDevice: async (deviceData) => {
    try {
      set({ loading: true, error: null });
      
      const docRef = await addDoc(collection(db, "ict_inventory"), {
        ...deviceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Fetch updated list
      get().fetchDevices();
      
      return docRef.id;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update device
  updateDevice: async (deviceId, deviceData) => {
    try {
      set({ loading: true, error: null });
      
      const deviceRef = doc(db, "ict_inventory", deviceId);
      await updateDoc(deviceRef, {
        ...deviceData,
        updatedAt: serverTimestamp(),
      });

      // Update the device in the local state
      set(state => ({
        devices: state.devices.map(device => 
          device.id === deviceId 
            ? { ...device, ...deviceData, updatedAt: new Date() }
            : device
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete device
  deleteDevice: async (deviceId) => {
    try {
      set({ loading: true, error: null });
      
      await deleteDoc(doc(db, "ict_inventory", deviceId));

      // Remove the device from the local state
      set(state => ({
        devices: state.devices.filter(device => device.id !== deviceId),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Search devices
  searchDevices: (searchQuery) => {
    const { devices } = get();
    const searchLower = searchQuery.toLowerCase();
    
    return devices.filter(device => (
      device.serialNumber?.toLowerCase().includes(searchLower) ||
      device.brandModel?.toLowerCase().includes(searchLower) ||
      device.userAssignment?.staffName?.toLowerCase().includes(searchLower)
    ));
  },
}));

export default useDeviceStore;
