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
  deleteDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Search, Plus, Package, Pencil, Trash2, Calendar } from "lucide-react";
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
    deliveredBy: ""
  });

  const [editDelivery, setEditDelivery] = useState({
    id: "",
    supplyId: "",
    supplyName: "",
    quantity: "",
    notes: "",
    deliveredBy: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

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
        suppliesData.push({ id: doc.id, ...doc.data() });
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
    
    setFilteredDeliveries(filtered);
  }, [searchTerm, allDeliveries, selectedDate]);

  const handleAddDelivery = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Start a Firestore transaction
      await runTransaction(db, async (transaction) => {
        // Get the supply document
        const supplyRef = doc(db, "supplies", selectedSupply);
        const supplyDoc = await transaction.get(supplyRef);

        if (!supplyDoc.exists()) {
          throw new Error("Supply not found!");
        }

        // Calculate new quantity
        const currentQuantity = supplyDoc.data().quantity || 0;
        const deliveryQuantity = parseInt(newDelivery.quantity);
        const newQuantity = currentQuantity + deliveryQuantity;

        // Get the next delivery ID
        const deliveriesRef = collection(db, "deliveries");
        const deliveriesSnapshot = await getDocs(deliveriesRef);
        const deliveryCount = deliveriesSnapshot.size;
        const nextDeliveryId = String(deliveryCount + 1).padStart(5, '0');

        // Create the delivery document
        const deliveryData = {
          id: nextDeliveryId,
          ...newDelivery,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };

        // Update both documents in the transaction
        const newDeliveryRef = doc(collection(db, "deliveries"));
        transaction.set(newDeliveryRef, deliveryData);
        transaction.update(supplyRef, { 
          quantity: newQuantity,
          updatedAt: Timestamp.now()
        });
      });

      setDialogOpen(false);
      setNewDelivery({
        supplyId: "",
        supplyName: "",
        quantity: "",
        notes: "",
        deliveredBy: ""
      });
      setSelectedSupply(null);
      toast.success("Delivery added and supply quantity updated successfully");
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
      deliveredBy: delivery.deliveredBy
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
        const currentQuantity = supplyDoc.data().quantity;
        const newQuantity = currentQuantity - parseInt(selectedDeliveryForDelete.quantity);

        // Update supply quantity
        transaction.update(supplyRef, {
          quantity: newQuantity,
          updatedAt: Timestamp.now()
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Delivery</DialogTitle>
                <DialogDescription>
                  Add a new delivery record to the system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDelivery} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supply</label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {selectedSupply
                          ? supplies.find((supply) => supply.id === selectedSupply)?.name
                          : "Select supply..."}
                        <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search supplies..." 
                          className="border-none focus:ring-0"
                          value={commandInputValue}
                          onValueChange={setCommandInputValue}
                        />
                        <CommandEmpty>No supply found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {supplies.length > 5 && !commandInputValue ? (
                            <>
                              {supplies.slice(0, 5).map((supply) => (
                                <CommandItem
                                  key={supply.id}
                                  onSelect={() => {
                                    setSelectedSupply(supply.id);
                                    setNewDelivery(prev => ({
                                      ...prev,
                                      supplyId: supply.id,
                                      supplyName: supply.name
                                    }));
                                    setOpen(false);
                                  }}
                                >
                                  {supply.name}
                                </CommandItem>
                              ))}
                              <div className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-800">
                                Type to search more supplies...
                              </div>
                            </>
                          ) : (
                            supplies.map((supply) => (
                              <CommandItem
                                key={supply.id}
                                onSelect={() => {
                                  setSelectedSupply(supply.id);
                                  setNewDelivery(prev => ({
                                    ...prev,
                                    supplyId: supply.id,
                                    supplyName: supply.name
                                  }));
                                  setOpen(false);
                                }}
                              >
                                {supply.name}
                              </CommandItem>
                            ))
                          )}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    value={newDelivery.quantity}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivered By</label>
                  <Input
                    type="text"
                    value={newDelivery.deliveredBy}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, deliveredBy: e.target.value }))}
                    placeholder="Enter name of delivery person"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    value={newDelivery.notes}
                    onChange={(e) => setNewDelivery(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Adding..." : "Add Delivery"}
                </Button>
              </form>
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
                placeholder="Search by ID or supply name..."
                className="pl-10 text-sm pr-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
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
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="p-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Supply Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Delivered By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array(5).fill(null).map((_, index) => (
                    <TableRow key={`loading-${index}`}>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-32" />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-9 w-9" />
                          <Skeleton className="h-9 w-9" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No deliveries found
                    </TableCell>
                  </TableRow>
                ) : (
                  currentDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-mono">{delivery.id}</TableCell>
                      <TableCell>
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 font-medium">
                          {delivery.supplyName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 font-medium">
                          {delivery.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{delivery.deliveredBy}</TableCell>
                      <TableCell>{delivery.notes}</TableCell>
                      <TableCell>
                        {delivery.createdAt?.toDate().toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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

          {/* Pagination - only show if there are more than 15 items */}
          {filteredDeliveries.length > rowsPerPage && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>
              Update the delivery record
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supply</label>
              <Popover open={editOpen} onOpenChange={setEditOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editOpen}
                    className="w-full justify-between"
                  >
                    {selectedSupply
                      ? supplies.find((supply) => supply.id === selectedSupply)?.name
                      : "Select supply..."}
                    <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search supplies..." 
                      className="border-none focus:ring-0"
                      value={editCommandInputValue}
                      onValueChange={setEditCommandInputValue}
                    />
                    <CommandEmpty>No supply found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      {supplies.length > 5 && !editCommandInputValue ? (
                        <>
                          {supplies.slice(0, 5).map((supply) => (
                            <CommandItem
                              key={supply.id}
                              onSelect={() => {
                                setSelectedSupply(supply.id);
                                setEditDelivery(prev => ({
                                  ...prev,
                                  supplyId: supply.id,
                                  supplyName: supply.name
                                }));
                                setEditOpen(false);
                              }}
                            >
                              {supply.name}
                            </CommandItem>
                          ))}
                          <div className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-800">
                            Type to search more supplies...
                          </div>
                        </>
                      ) : (
                        supplies.map((supply) => (
                          <CommandItem
                            key={supply.id}
                            onSelect={() => {
                              setSelectedSupply(supply.id);
                              setEditDelivery(prev => ({
                                ...prev,
                                supplyId: supply.id,
                                supplyName: supply.name
                              }));
                              setEditOpen(false);
                            }}
                          >
                            {supply.name}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={editDelivery.quantity}
                onChange={(e) => setEditDelivery(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivered By</label>
              <Input
                type="text"
                value={editDelivery.deliveredBy}
                onChange={(e) => setEditDelivery(prev => ({ ...prev, deliveredBy: e.target.value }))}
                placeholder="Enter name of delivery person"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={editDelivery.notes}
                onChange={(e) => setEditDelivery(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Delivery"}
            </Button>
          </form>
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
    </div>
  );
} 