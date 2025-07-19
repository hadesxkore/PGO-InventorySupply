// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, startAfter, where, doc, updateDoc, deleteDoc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-WwlZURaJcT77XtML7-hV0gdVL-xcG-4",
  authDomain: "pgo---inventory-supplies.firebaseapp.com",
  projectId: "pgo---inventory-supplies",
  storageBucket: "pgo---inventory-supplies.firebasestorage.app",
  messagingSenderId: "189582548649",
  appId: "1:189582548649:web:b7a88b8c77e25f6d62d3b8",
  measurementId: "G-RNP0ZQN76R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Clusters data
export const clusters = [
  { code: 'WRT', name: 'Writing Supplies' },
  { code: 'OFC', name: 'Office Supplies' },
  { code: 'PPR', name: 'Paper Products' },
  { code: 'INK', name: 'Inks & Stamps' },
  { code: 'CUT', name: 'Cutting Tools' },
  { code: 'TEC', name: 'Tech & Storage' },
  { code: 'CLN', name: 'Cleaning Supplies' },
  { code: 'PKG', name: 'Packaging / Bags' },
  { code: 'PRS', name: 'Personal & Safety' },
  { code: 'BRD', name: 'Board & Display' }
];

// Helper function to get the next ID number for a cluster
async function getNextIdForCluster(cluster) {
  const suppliesRef = collection(db, "supplies");
  const q = query(
    suppliesRef,
    where("id", ">=", `${cluster}-`),
    where("id", "<=", `${cluster}-\uf8ff`),
    orderBy("id", "desc"),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return `${cluster}-0001`; // First item in this cluster
  }

  const lastId = snapshot.docs[0].data().id;
  const lastNumber = parseInt(lastId.split('-')[1]);
  const nextNumber = lastNumber + 1;
  return `${cluster}-${nextNumber.toString().padStart(4, '0')}`;
}

// Supply Collection Functions
export const addSupply = async (supplyData) => {
  try {
    const newId = await getNextIdForCluster(supplyData.cluster);
    const supplyRef = doc(db, "supplies", newId);
    
    await setDoc(supplyRef, {
      ...supplyData,
      id: newId,
      dateAdded: serverTimestamp(),
      dateUpdated: serverTimestamp()
    });

    return newId;
  } catch (error) {
    console.error("Error adding supply:", error);
    throw error;
  }
};

export const getSupplies = async (lastDoc = null, itemsPerPage = 20) => {
  try {
    let q = query(
      collection(db, "supplies"),
      orderBy("id", "desc"),
      limit(itemsPerPage)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const supplies = [];
    querySnapshot.forEach((doc) => {
      supplies.push({ id: doc.id, ...doc.data() });
    });

    return {
      supplies,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: querySnapshot.docs.length === itemsPerPage
    };
  } catch (error) {
    console.error("Error getting supplies:", error);
    throw error;
  }
};

export const updateSupply = async (id, updatedData) => {
  try {
    const supplyRef = doc(db, "supplies", id);
    const supplyDoc = await getDoc(supplyRef);
    if (!supplyDoc.exists()) {
      throw new Error("Supply not found!");
    }
    const currentSupply = supplyDoc.data();

    // If cluster is being changed, we need to update the ID
    if (updatedData.cluster && currentSupply.cluster !== updatedData.cluster) {
      // Get new ID for the new cluster
      const newId = await getNextIdForCluster(updatedData.cluster);
      
      // Create new document with new ID
      const newSupplyRef = doc(db, "supplies", newId);
      
      // Prepare the updated data, ensuring no undefined values
      const updatedSupplyData = {
        ...currentSupply,  // Start with all current data
        ...updatedData,    // Override with new data
        id: newId,         // Set new ID
        dateUpdated: serverTimestamp(),
        // Ensure these fields are never undefined
        name: updatedData.name || currentSupply.name,
        quantity: updatedData.quantity ?? currentSupply.quantity,
        unit: updatedData.unit || currentSupply.unit,
        cluster: updatedData.cluster,
        classification: updatedData.classification || currentSupply.classification || 'N/A',
        image: updatedData.image || currentSupply.image || '',
        availability: updatedData.availability ?? updatedData.quantity ?? currentSupply.quantity
      };

      // Remove any undefined or null values
      Object.keys(updatedSupplyData).forEach(key => {
        if (updatedSupplyData[key] === undefined || updatedSupplyData[key] === null) {
          delete updatedSupplyData[key];
        }
      });
      
      // Create new document with new ID
      await setDoc(newSupplyRef, updatedSupplyData);

      // Delete old document
      await deleteDoc(supplyRef);

      return newId; // Return new ID for UI update
    } else {
      // If cluster isn't changing, just update normally
      // Remove any undefined values from updatedData
      const cleanUpdatedData = { ...updatedData };
      Object.keys(cleanUpdatedData).forEach(key => {
        if (cleanUpdatedData[key] === undefined || cleanUpdatedData[key] === null) {
          delete cleanUpdatedData[key];
        }
      });

      await updateDoc(supplyRef, {
        ...cleanUpdatedData,
        dateUpdated: serverTimestamp()
      });
      return id;
    }
  } catch (error) {
    console.error("Error updating supply:", error);
    throw error;
  }
};

export const deleteSupply = async (supplyId) => {
  try {
    const supplyRef = doc(db, "supplies", supplyId);
    await deleteDoc(supplyRef);
  } catch (error) {
    console.error("Error deleting supply:", error);
    throw error;
  }
};

export const searchSupplies = async (searchTerm) => {
  try {
    const q = query(
      collection(db, "supplies"),
      where("name", ">=", searchTerm),
      where("name", "<=", searchTerm + "\uf8ff"),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    const supplies = [];
    querySnapshot.forEach((doc) => {
      supplies.push({ id: doc.id, ...doc.data() });
    });
    
    return supplies;
  } catch (error) {
    console.error("Error searching supplies:", error);
    throw error;
  }
}; 

// Add new classification
export const addClassification = async (name) => {
  try {
    await addDoc(collection(db, "classifications"), {
      name: name.trim(),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding classification:", error);
    throw error;
  }
}; 