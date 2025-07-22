import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Card } from "../ui/card";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  Timestamp,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  deleteDoc,
  serverTimestamp,
  limit
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Search, Plus, Package, Pencil, Trash2, Calendar, ArrowUpDown, Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../ui/calendar";
import React from "react"; // Added missing import for React
import { Label } from "../ui/label";

export function DeliveryPage() {
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeliveryForDelete, setSelectedDeliveryForDelete] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [commandInputValue, setCommandInputValue] = useState("");
  const [editCommandInputValue, setEditCommandInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    todayDeliveries: 0,
    monthDeliveries: 0
  });

  const [newDelivery, setNewDelivery] = useState({
    supplyId: "",
    supplyName: "",
    quantity: "",
    notes: "",
    deliveredBy: "",
    classification: "" // Add classification field
  });

  const [editDelivery, setEditDelivery] = useState({
    id: "",
    supplyId: "",
    supplyName: "",
    quantity: "",
    notes: "",
    deliveredBy: "",
    classification: "" // Add classification field
  });

  const [classifications, setClassifications] = useState([]);
  const [classificationSearchOpen, setClassificationSearchOpen] = useState(false);
  const [classificationSearchQuery, setClassificationSearchQuery] = useState("");
  const [newClassificationDialogOpen, setNewClassificationDialogOpen] = useState(false);
  const [newClassification, setNewClassification] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortOrder, setSortOrder] = useState('asc');

  // Generate placeholder rows
  const generatePlaceholderRows = () => {
    return Array(12).fill(null).map((_, index) => ({
      id: `placeholder-${index}`,
      supplyId: "",
      supplyName: "",
      quantity: "",
      deliveredBy: "",
      createdAt: null,
      notes: ""
    }));
  };

  // Replace the old placeholderRows with the new function
  const placeholderRows = generatePlaceholderRows();

  // Calculate pagination values
  const totalPages = Math.ceil(filteredDeliveries.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentDeliveries = filteredDeliveries.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Fetch supplies for the dropdown
  useEffect(() => {
    const q = query(collection(db, "supplies"), orderBy("name"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppliesData = [];
      snapshot.forEach((doc) => {
        suppliesData.push({ id: doc.id, docId: doc.id, ...doc.data() });
      });
      setSupplies(suppliesData);
    });

    return () => unsubscribe();
  }, []);

  // Fetch deliveries
  useEffect(() => {
    const q = query(collection(db, "deliveries"), orderBy("createdAt", "desc"));
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deliveriesData = [];
      snapshot.forEach((doc) => {
        deliveriesData.push({ id: doc.id, ...doc.data() });
      });
      setAllDeliveries(deliveriesData);
      setFilteredDeliveries(deliveriesData);
      
      // Update stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      
      setStats({
        totalDeliveries: deliveriesData.length,
        todayDeliveries: deliveriesData.filter(d => d.createdAt?.toDate().getTime() >= today).length,
        monthDeliveries: deliveriesData.filter(d => d.createdAt?.toDate().getTime() >= monthStart).length
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching deliveries:", error);
      toast.error("Failed to fetch deliveries");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch classifications
  useEffect(() => {
    const q = query(collection(db, "classifications"), orderBy("name"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classificationsData = [];
      snapshot.forEach((doc) => {
        classificationsData.push({ id: doc.id, ...doc.data() });
      });
      setClassifications(classificationsData);
    }, (error) => {
      console.error("Error fetching classifications:", error);
      toast.error("Failed to fetch classifications");
    });

    return () => unsubscribe();
  }, []);

  // Filter classifications based on search query
  const filteredClassifications = classifications.filter(classification =>
    classification.name.toLowerCase().includes(classificationSearchQuery.toLowerCase())
  );

  const handleAddClassification = async (e) => {
    e.preventDefault();
    if (!newClassification.trim()) {
      toast.error("Please enter a classification name");
      return;
    }

    try {
      await addDoc(collection(db, "classifications"), {
        name: newClassification.trim(),
        createdAt: serverTimestamp()
      });
      setNewClassification("");
      setNewClassificationDialogOpen(false);
      toast.success("Classification added successfully");
    } catch (error) {
      console.error("Error adding classification:", error);
      toast.error("Failed to add classification");
    }
  };

  // Modified search effect to include date filtering
  useEffect(() => {
    let filtered = allDeliveries;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(delivery => 
        delivery.id.toLowerCase().includes(searchLower) || 
        delivery.supplyName.toLowerCase().includes(searchLower)
      );
    }

    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter(delivery => {
        const deliveryDate = delivery.createdAt?.toDate();
        return deliveryDate >= startOfDay && deliveryDate <= endOfDay;
      });
    }

    // Sort the filtered deliveries by supply name
    filtered = [...filtered].sort((a, b) => {
      const nameA = (a.supplyName || '').charAt(0).toLowerCase();
      const nameB = (b.supplyName || '').charAt(0).toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    setFilteredDeliveries(filtered);
  }, [searchTerm, allDeliveries, selectedDate, sortOrder]);

  // Add toggle sort function
  const toggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const handleAddDelivery = async (e) => {
    e.preventDefault();
    
    if (!newDelivery.supplyId || !newDelivery.supplyName) {
      toast.error("Please select a supply");
      return;
    }

    if (!newDelivery.quantity || parseInt(newDelivery.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!newDelivery.deliveredBy.trim()) {
      toast.error("Please enter who delivered the supply");
      return;
    }

    setLoading(true);

    try {
      // Start a Firestore transaction
      await runTransaction(db, async (transaction) => {
        // Get the supply document using the correct document ID
        const supplyRef = doc(db, "supplies", newDelivery.supplyId);
        const supplyDoc = await transaction.get(supplyRef);

        if (!supplyDoc.exists()) {
          throw new Error("Supply not found. Please refresh and try again.");
        }

        // Get all deliveries to determine the next ID
        const deliveriesRef = collection(db, "deliveries");
        const deliveriesQuery = query(deliveriesRef, orderBy("id", "desc"), limit(1));
        const deliveriesSnapshot = await getDocs(deliveriesQuery);
        
        // Generate the next delivery ID
        let nextNumber = 1;
        if (!deliveriesSnapshot.empty) {
          const lastDelivery = deliveriesSnapshot.docs[0].data();
          const lastNumber = parseInt(lastDelivery.id.split('-')[1]);
          nextNumber = lastNumber + 1;
        }
        const newDeliveryId = `DLV-${String(nextNumber).padStart(4, '0')}`;

        // Calculate new quantities
        const currentQuantity = supplyDoc.data().quantity || 0;
        const currentAvailability = supplyDoc.data().availability || 0;
        const deliveryQuantity = parseInt(newDelivery.quantity);
        const newQuantity = currentQuantity + deliveryQuantity;
        const newAvailability = currentAvailability + deliveryQuantity; // Add to current availability instead of setting equal to total

        // Update supply quantity and classification
        const updateData = {
          quantity: newQuantity,
          availability: newAvailability, // Use the new availability calculation
          dateUpdated: serverTimestamp()
        };

        // Only update classification if it's provided and different from current
        if (newDelivery.classification && 
            newDelivery.classification !== "N/A" && 
            newDelivery.classification !== supplyDoc.data().classification) {
          updateData.classification = newDelivery.classification;
        }

        // Update the supply document
        transaction.update(supplyRef, updateData);

        // Add delivery record with the new ID format
        const deliveryRef = doc(db, "deliveries", newDeliveryId);
        transaction.set(deliveryRef, {
          id: newDeliveryId,
          supplyId: newDelivery.supplyId,
          supplyName: newDelivery.supplyName,
          classification: newDelivery.classification || supplyDoc.data().classification || "N/A",
          quantity: deliveryQuantity,
          deliveredBy: newDelivery.deliveredBy.trim(),
          notes: newDelivery.notes.trim(),
          createdAt: serverTimestamp()
        });
      });

      setDialogOpen(false);
      setNewDelivery({
        supplyId: "",
        supplyName: "",
        classification: "",
        quantity: "",
        notes: "",
        deliveredBy: ""
      });
      setCommandInputValue("");
      setOpen(false);
      toast.success("Delivery added successfully");
    } catch (error) {
      console.error("Error adding delivery:", error);
      toast.error(error.message || "Failed to add delivery");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (delivery) => {
    setEditDelivery({
      id: delivery.id,
      supplyId: delivery.supplyId,
      supplyName: delivery.supplyName,
      quantity: delivery.quantity,
      notes: delivery.notes,
      deliveredBy: delivery.deliveredBy,
      classification: delivery.classification // Add classification field
    });
    setSelectedSupply(delivery.supplyId);
    setEditDialogOpen(true);
  };

  const handleDelete = (delivery) => {
    setSelectedDeliveryForDelete(delivery);
    setDeleteDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await runTransaction(db, async (transaction) => {
        // Get the old delivery document to calculate quantity difference
        const deliveryRef = doc(db, "deliveries", editDelivery.id);
        const oldDeliveryDoc = await transaction.get(deliveryRef);
        const oldQuantity = oldDeliveryDoc.data().quantity;
        const quantityDifference = parseInt(editDelivery.quantity) - parseInt(oldQuantity);

        // Update supply quantity
        const supplyRef = doc(db, "supplies", editDelivery.supplyId);
        const supplyDoc = await transaction.get(supplyRef);
        const currentQuantity = supplyDoc.data().quantity;
        
        transaction.update(supplyRef, {
          quantity: currentQuantity + quantityDifference,
          updatedAt: Timestamp.now()
        });

        // Update delivery document
        transaction.update(deliveryRef, {
          ...editDelivery,
          updatedAt: Timestamp.now()
        });
      });

      setEditDialogOpen(false);
      toast.success("Delivery updated successfully");
    } catch (error) {
      console.error("Error updating delivery:", error);
      toast.error(error.message || "Failed to update delivery");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeliveryForDelete) return;

    try {
      await runTransaction(db, async (transaction) => {
        // Get the supply document to update quantity
        const supplyRef = doc(db, "supplies", selectedDeliveryForDelete.supplyId);
        const supplyDoc = await transaction.get(supplyRef);
        
        if (!supplyDoc.exists()) {
          throw new Error("Supply not found. The supply might have been deleted.");
        }

        const currentQuantity = supplyDoc.data().quantity;
        const currentAvailability = supplyDoc.data().availability ?? supplyDoc.data().quantity;
        const deliveryQuantity = parseInt(selectedDeliveryForDelete.quantity);

        // Calculate new quantities
        const newQuantity = currentQuantity - deliveryQuantity;
        const newAvailability = currentAvailability - deliveryQuantity;

        // Ensure quantities don't go negative
        if (newQuantity < 0 || newAvailability < 0) {
          throw new Error("Cannot delete delivery as it would result in negative stock. Please check other transactions first.");
        }

        // Update supply quantity and availability
        transaction.update(supplyRef, {
          quantity: newQuantity,
          availability: newAvailability,
          updatedAt: serverTimestamp()
        });

        // Delete delivery document
        const deliveryRef = doc(db, "deliveries", selectedDeliveryForDelete.id);
        transaction.delete(deliveryRef);
      });

      setDeleteDialogOpen(false);
      setSelectedDeliveryForDelete(null);
      toast.success("Delivery deleted successfully");
    } catch (error) {
      console.error("Error deleting delivery:", error);
      toast.error(error.message || "Failed to delete delivery");
    }
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Delivery Records
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] p-0">
              <div className="grid grid-cols-5 min-h-[600px]">
                {/* Left Column - Supply Selection */}
                <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col gap-6 border-r border-slate-200 dark:border-slate-800">
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Supply Selection</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Supply</Label>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between bg-white dark:bg-slate-900"
                            >
                              {newDelivery.supplyName || "Select a supply..."}
                              <span className="ml-2 opacity-50">⌄</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search supplies..."
                                value={commandInputValue}
                                onValueChange={setCommandInputValue}
                              />
                              <CommandEmpty>No supply found.</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {supplies.map((supply) => (
                                  <CommandItem
                                    key={supply.id}
                                    value={supply.name}
                                    onSelect={() => {
                                      setNewDelivery({
                                        ...newDelivery,
                                        supplyId: supply.docId, // Use docId instead of id
                                        supplyName: supply.name,
                                        classification: supply.classification || "" // Get classification from supply
                                      });
                                      setOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{supply.name}</span>
                                      <span className="text-sm text-gray-500">({supply.id})</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Classification</Label>
                        <Popover open={classificationSearchOpen} onOpenChange={setClassificationSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={classificationSearchOpen}
                              className="w-full justify-between bg-white dark:bg-slate-900"
                            >
                              {newDelivery.classification || "Select a classification..."}
                              <span className="ml-2 opacity-50">⌄</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search classification..."
                                value={classificationSearchQuery}
                                onValueChange={setClassificationSearchQuery}
                              />
                              <CommandEmpty>No classification found.</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {filteredClassifications.map((classification) => (
                                  <CommandItem
                                    key={classification.id}
                                    value={classification.name}
                                    onSelect={(value) => {
                                      setNewDelivery({ ...newDelivery, classification: value });
                                      setClassificationSearchOpen(false);
                                    }}
                                  >
                                    {classification.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewClassificationDialogOpen(true)}
                          className="w-full mt-2 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add New Classification
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Delivery Details */}
                <div className="col-span-3 p-8">
                  <DialogHeader className="mb-8">
                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-200">Add New Delivery</DialogTitle>
                    <DialogDescription className="text-base text-slate-500 dark:text-slate-400">
                      Enter the delivery details below
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleAddDelivery} className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Delivery Details</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            required
                            className="h-[38px] bg-white dark:bg-slate-900"
                            value={newDelivery.quantity}
                            onChange={(e) => setNewDelivery({ ...newDelivery, quantity: e.target.value })}
                            placeholder="Enter quantity"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Delivered By</Label>
                          <Input
                            required
                            className="h-[38px] bg-white dark:bg-slate-900"
                            value={newDelivery.deliveredBy}
                            onChange={(e) => setNewDelivery({ ...newDelivery, deliveredBy: e.target.value })}
                            placeholder="Enter name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
                        <Input
                          className="h-[38px] bg-white dark:bg-slate-900"
                          value={newDelivery.notes}
                          onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                          placeholder="Add any additional notes"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                      <Button 
                        type="submit" 
                        size="lg" 
                        className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Adding Delivery...
                          </>
                        ) : (
                          <>
                            <Plus className="w-5 h-5 mr-1" />
                            Add Delivery
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/40 border-none relative overflow-hidden min-h-[160px]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Deliveries</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {stats.totalDeliveries}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                  <Package className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-8 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/40 border-none relative overflow-hidden min-h-[160px]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Deliveries</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {stats.todayDeliveries}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
                  <Calendar className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-8 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-800/40 border-none relative overflow-hidden min-h-[160px]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month's Deliveries</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {stats.monthDeliveries}
                  </p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full">
                  <Calendar className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search deliveries..." 
                className="pl-10 text-sm pr-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSort}
                className={cn(
                  "h-10 w-10",
                  sortOrder === 'desc' && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                )}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>

              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    {selectedDate ? format(selectedDate, 'PP') : 'Filter by date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 dark:text-red-400"
                        onClick={() => {
                          setSelectedDate(null);
                          setDatePickerOpen(false);
                        }}
                      >
                        Clear filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredDeliveries.length} deliveries
                {selectedDate && ` for ${format(selectedDate, 'PP')}`}
                {` (${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`}
              </div>
            </div>
          </div>
        </div>

        {/* Table section */}
        <div className="p-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="max-h-[600px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-[120px]">ID</TableHead>
                    <TableHead className="min-w-[200px]">Supply Name</TableHead>
                    <TableHead className="w-[150px]">Classification</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="min-w-[150px]">Delivered By</TableHead>
                    <TableHead className="min-w-[180px]">Date & Time</TableHead>
                    <TableHead className="min-w-[200px]">Notes</TableHead>
                    <TableHead className="w-[180px] text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Loading skeletons
                    Array(5).fill(null).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Skeleton className="h-9 w-9" />
                            <Skeleton className="h-9 w-9" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : currentDeliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No deliveries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentDeliveries.map((delivery) => (
                      <TableRow key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-mono">{delivery.id}</TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 font-medium">
                            {delivery.supplyName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium">
                            {delivery.classification || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-medium">
                            {delivery.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{delivery.deliveredBy}</TableCell>
                        <TableCell>{delivery.createdAt?.toDate().toLocaleString()}</TableCell>
                        <TableCell>{delivery.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(delivery)}
                              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDelete(delivery)}
                              className="bg-red-600 hover:bg-red-700 text-white gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {!loading && filteredDeliveries.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredDeliveries.length)} of {filteredDeliveries.length} deliveries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, i, arr) => (
                      <React.Fragment key={page}>
                        {i > 0 && arr[i - 1] !== page - 1 && (
                          <span className="text-gray-400 dark:text-gray-600">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "h-8 w-8 p-0",
                            currentPage === page && "bg-blue-600 hover:bg-blue-700"
                          )}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-2"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Delivery Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px] p-0">
          <div className="grid grid-cols-5 min-h-[600px]">
            {/* Left Column - Supply Selection */}
            <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col gap-6 border-r border-slate-200 dark:border-slate-800">
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Supply Selection</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Supply</Label>
                    <Popover open={editOpen} onOpenChange={setEditOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editOpen}
                          className="w-full justify-between bg-white dark:bg-slate-900"
                        >
                          {editDelivery.supplyName || "Select a supply..."}
                          <span className="ml-2 opacity-50">⌄</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search supplies..."
                            value={editCommandInputValue}
                            onValueChange={setEditCommandInputValue}
                          />
                          <CommandEmpty>No supply found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {supplies.map((supply) => (
                              <CommandItem
                                key={supply.id}
                                value={supply.name}
                                onSelect={() => {
                                  setEditDelivery({
                                    ...editDelivery,
                                    supplyId: supply.docId, // Use docId instead of id
                                    supplyName: supply.name,
                                    classification: supply.classification || ""
                                  });
                                  setEditOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{supply.name}</span>
                                  <span className="text-sm text-gray-500">({supply.id})</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Classification</Label>
                    <Popover open={classificationSearchOpen} onOpenChange={setClassificationSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={classificationSearchOpen}
                          className="w-full justify-between bg-white dark:bg-slate-900"
                        >
                          {editDelivery.classification || "Select a classification..."}
                          <span className="ml-2 opacity-50">⌄</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search classification..."
                            value={classificationSearchQuery}
                            onValueChange={setClassificationSearchQuery}
                          />
                          <CommandEmpty>No classification found.</CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {filteredClassifications.map((classification) => (
                              <CommandItem
                                key={classification.id}
                                value={classification.name}
                                onSelect={(value) => {
                                  setEditDelivery({ ...editDelivery, classification: value });
                                  setClassificationSearchOpen(false);
                                }}
                              >
                                {classification.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setNewClassificationDialogOpen(true)}
                      className="w-full mt-2 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add New Classification
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Delivery Details */}
            <div className="col-span-3 p-8">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-200">Edit Delivery</DialogTitle>
                <DialogDescription className="text-base text-slate-500 dark:text-slate-400">
                  Update the delivery details below
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditSubmit} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Delivery Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        required
                        className="h-[38px] bg-white dark:bg-slate-900"
                        value={editDelivery.quantity}
                        onChange={(e) => setEditDelivery({ ...editDelivery, quantity: e.target.value })}
                        placeholder="Enter quantity"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Delivered By</Label>
                      <Input
                        required
                        className="h-[38px] bg-white dark:bg-slate-900"
                        value={editDelivery.deliveredBy}
                        onChange={(e) => setEditDelivery({ ...editDelivery, deliveredBy: e.target.value })}
                        placeholder="Enter name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes</Label>
                    <Input
                      className="h-[38px] bg-white dark:bg-slate-900"
                      value={editDelivery.notes}
                      onChange={(e) => setEditDelivery({ ...editDelivery, notes: e.target.value })}
                      placeholder="Add any additional notes"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating Delivery...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-1" />
                        Update Delivery
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery? This action will also update the supply quantity and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Classification Dialog */}
      <Dialog open={newClassificationDialogOpen} onOpenChange={setNewClassificationDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Classification</DialogTitle>
            <DialogDescription>
              Enter a new classification for supplies
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClassification} className="space-y-4">
            <div className="space-y-2">
              <Label>Classification Name</Label>
              <Input
                value={newClassification}
                onChange={(e) => setNewClassification(e.target.value)}
                placeholder="Enter classification name"
                className="h-10"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewClassificationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add Classification
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 