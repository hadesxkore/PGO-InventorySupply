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

// Get next ID for supplies with cluster prefix
export const getNextSupplyId = async (clusterCode) => {
  try {
    // Get the counter document for the specific cluster
    const counterRef = doc(db, 'counters', `supplies_${clusterCode}`);
    const counterDoc = await getDoc(counterRef);
    
    let nextId;
    if (!counterDoc.exists()) {
      // Initialize counter if it doesn't exist
      nextId = 1;
      await setDoc(counterRef, { currentId: nextId });
    } else {
      // Increment existing counter
      nextId = counterDoc.data().currentId + 1;
      await updateDoc(counterRef, { currentId: nextId });
    }
    
    // Format ID with cluster prefix and 4 digits (e.g., OFC-0001)
    return `${clusterCode}-${nextId.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error("Error generating next ID:", error);
    throw error;
  }
};

// Supply Collection Functions
export const addSupply = async (supplyData) => {
  try {
    const supplyId = await getNextSupplyId(supplyData.cluster);
    const docRef = await setDoc(doc(db, "supplies", supplyId), {
      ...supplyData,
      id: supplyId,
      dateAdded: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return supplyId;
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

export const updateSupply = async (supplyId, updateData) => {
  try {
    const supplyRef = doc(db, "supplies", supplyId);
    await updateDoc(supplyRef, updateData);
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