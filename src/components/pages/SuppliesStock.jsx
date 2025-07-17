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
import { uploadImage } from "../../lib/cloudinary";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { 
  addSupply, 
  getSupplies, 
  updateSupply, 
  deleteSupply,
  searchSupplies,
  db,
  clusters
} from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy, where, addDoc } from "firebase/firestore";
import { Search, Plus, Pencil, Trash2, Package, Boxes, AlertTriangle, XCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Skeleton } from "../ui/skeleton";

export function SuppliesStock() {
  const [allSupplies, setAllSupplies] = useState([]); // Store all supplies
  const [filteredSupplies, setFilteredSupplies] = useState([]); // Store filtered supplies
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [newUnitDialogOpen, setNewUnitDialogOpen] = useState(false);
  const [units, setUnits] = useState([]);
  const [newUnit, setNewUnit] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [newSupply, setNewSupply] = useState({
    name: "",
    quantity: "",
    unit: "",
    image: "",
    cluster: "", // Add cluster to the state
  });
  const [editSupply, setEditSupply] = useState({
    id: "",
    name: "",
    quantity: "",
    unit: "",
    image: "",
    cluster: "", // Add cluster to edit state
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch units from Firebase
  useEffect(() => {
    const q = query(collection(db, "units"), orderBy("name"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unitsData = [];
      snapshot.forEach((doc) => {
        unitsData.push({ id: doc.id, ...doc.data() });
      });
      setUnits(unitsData);
    }, (error) => {
      console.error("Error fetching units:", error);
      toast.error("Failed to fetch units");
    });

    return () => unsubscribe();
  }, []);

  // Main data subscription
  useEffect(() => {
    const q = query(collection(db, "supplies"), orderBy("id", "desc"));
    
    setIsLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppliesData = [];
      snapshot.forEach((doc) => {
        suppliesData.push({ id: doc.id, ...doc.data() });
      });
      setAllSupplies(suppliesData);
      setFilteredSupplies(suppliesData); // Initialize filtered supplies with all supplies
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching supplies:", error);
      toast.error("Failed to fetch supplies");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Modified search effect to include date filtering
  useEffect(() => {
    let filtered = allSupplies;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(supply => 
        supply.id.toLowerCase().includes(searchLower) || 
        supply.name.toLowerCase().includes(searchLower)
      );
    }

    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter(supply => {
        const supplyDate = supply.createdAt?.toDate();
        return supplyDate >= startOfDay && supplyDate <= endOfDay;
      });
    }
    
    setFilteredSupplies(filtered);
  }, [searchTerm, allSupplies, selectedDate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnit.trim()) {
      toast.error("Please enter a unit name");
      return;
    }

    try {
      await addDoc(collection(db, "units"), {
        name: newUnit.trim()
      });
      setNewUnit("");
      setNewUnitDialogOpen(false);
      toast.success("Unit added successfully");
    } catch (error) {
      console.error("Error adding unit:", error);
      toast.error("Failed to add unit");
    }
  };

  const handleAddSupply = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = "";
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      await addSupply({
        ...newSupply,
        image: imageUrl,
        quantity: parseInt(newSupply.quantity),
        availability: parseInt(newSupply.quantity), // Add initial availability
      });

      setDialogOpen(false);
      setNewSupply({ name: "", quantity: "", unit: "", image: "", cluster: "" });
      setSelectedImage(null);
      toast.success("Supply added successfully");
    } catch (error) {
      toast.error("Failed to add supply");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (supply) => {
    setEditSupply({
      id: supply.id,
      name: supply.name,
      quantity: supply.quantity.toString(),
      unit: supply.unit,
      image: supply.image,
      cluster: supply.id.split('-')[0], // Extract cluster from ID
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (supply) => {
    setSelectedSupply(supply);
    setDeleteDialogOpen(true);
  };

  const handleEditSupply = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = editSupply.image;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      await updateSupply(editSupply.id, {
        ...editSupply,
        image: imageUrl,
        quantity: parseInt(editSupply.quantity),
        availability: parseInt(editSupply.quantity), // Update availability when quantity is updated
      });

      setEditDialogOpen(false);
      setSelectedImage(null);
      toast.success("Supply updated successfully");
    } catch (error) {
      console.error("Error updating supply:", error);
      toast.error("Failed to update supply");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedSupply) return;

    try {
      await deleteSupply(selectedSupply.id);
      setDeleteDialogOpen(false);
      setSelectedSupply(null);
      toast.success("Supply deleted successfully");
    } catch (error) {
      console.error("Error deleting supply:", error);
      toast.error("Failed to delete supply");
    }
  };

  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    
    // If it's a Firestore Timestamp object
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    
    // If it's an ISO string or any other date format
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Supplies & Stock
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Supply
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] p-0 gap-0">
              <div className="grid grid-cols-5 min-h-[600px]">
                {/* Left Column - Image Preview/Upload */}
                <div className="col-span-2 bg-gray-50 dark:bg-gray-900/50 p-6 flex flex-col gap-4 border-r border-gray-200 dark:border-gray-800">
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Supply Image</div>
                    <div className="relative flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900/30 overflow-hidden group">
                      {selectedImage ? (
                        <>
                          <img
                            src={URL.createObjectURL(selectedImage)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-white border-white hover:text-white"
                              onClick={() => setSelectedImage(null)}
                            >
                              Change Image
                            </Button>
                          </div>
                        </>
                      ) : (
                        <label className="flex-1 w-full h-full flex flex-col items-center justify-center cursor-pointer">
                          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          <div className="text-sm font-medium mb-1">Drop your image here</div>
                          <div className="text-xs text-gray-500 mb-4">or click to browse</div>
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    Supported formats: JPEG, PNG, GIF
                  </div>
                </div>

                {/* Right Column - Form Fields */}
                <div className="col-span-3 p-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Add New Supply</DialogTitle>
                    <DialogDescription className="text-sm">
                      Add a new supply item to the inventory
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleAddSupply} className="mt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Supply Details */}
                      <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">Supply Category</label>
                        <Select
                          value={newSupply.cluster}
                          onValueChange={(value) => setNewSupply({ ...newSupply, cluster: value })}
                          required
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {clusters.map((cluster) => (
                              <SelectItem key={cluster.code} value={cluster.code}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{cluster.name}</span>
                                  <span className="text-xs text-gray-500">({cluster.code})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          required
                          className="h-11 text-sm"
                          value={newSupply.name}
                          onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
                          placeholder="Enter supply name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          required
                          type="number"
                          min="0"
                          className="h-11 text-sm"
                          value={newSupply.quantity}
                          onChange={(e) => setNewSupply({ ...newSupply, quantity: e.target.value })}
                          placeholder="Enter quantity"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unit</label>
                        <Select
                          value={newSupply.unit}
                          onValueChange={(value) => setNewSupply({ ...newSupply, unit: value })}
                          required
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.name}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewUnitDialogOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add New Unit
                      </Button>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                      <Button type="submit" size="lg" className="w-full h-11 text-sm" disabled={loading}>
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Adding Supply...
                          </div>
                        ) : (
                          "Add Supply"
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add New Unit Dialog */}
          <Dialog open={newUnitDialogOpen} onOpenChange={setNewUnitDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>
                  Enter a new unit of measurement
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUnit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Name</label>
                  <Input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Enter unit name"
                    className="h-10"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewUnitDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Add Unit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/40 border-none relative overflow-hidden min-h-[160px]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {allSupplies.length}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                  <Boxes className="w-7 h-7 text-blue-600 dark:text-blue-400" />
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
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {allSupplies.filter(s => s.quantity < 10).length}
                  </p>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-full">
                  <AlertTriangle className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
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
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {allSupplies.filter(s => s.quantity === 0).length}
                  </p>
                </div>
                <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
                  <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by ID or name..."
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
                  Showing {filteredSupplies.length} supplies
                  {selectedDate && ` for ${format(selectedDate, 'PP')}`}
                </div>
              </div>
            </div>
          </div>

          {/* Table section */}
          <div className="p-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
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
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-24" />
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
                  ) : filteredSupplies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No supplies found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSupplies.map((supply) => (
                      <TableRow key={supply.id}>
                        <TableCell className="font-mono">{supply.id}</TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 font-medium">
                            {supply.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 font-medium">
                            {supply.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{supply.unit}</TableCell>
                        <TableCell>{supply.cluster}</TableCell>
                        <TableCell>
                          {formatDate(supply.dateAdded)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEditClick(supply)}
                              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeleteClick(supply)}
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
        </div>
      </div>

      {/* Edit Supply Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px] p-0 gap-0">
          <div className="grid grid-cols-5 min-h-[600px]">
            {/* Left Column - Image Preview/Upload */}
            <div className="col-span-2 bg-gray-50 dark:bg-gray-900/50 p-6 flex flex-col gap-4 border-r border-gray-200 dark:border-gray-800">
              <div className="flex-1 flex flex-col gap-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Supply Image</div>
                <div className="relative flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900/30 overflow-hidden group">
                  {selectedImage ? (
                    <>
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt="New"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-white border-white hover:text-white"
                          onClick={() => setSelectedImage(null)}
                        >
                          Change Image
                        </Button>
                      </div>
                    </>
                  ) : editSupply.image ? (
                    <>
                      <img
                        src={editSupply.image}
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-white border-white hover:text-white"
                          >
                            Change Image
                          </Button>
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="flex-1 w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-sm font-medium mb-1">Drop your image here</div>
                      <div className="text-xs text-gray-500 mb-4">or click to browse</div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Supported formats: JPEG, PNG, GIF
              </div>
            </div>

            {/* Right Column - Form Fields */}
            <div className="col-span-3 p-6">
              <DialogHeader>
                <DialogTitle className="text-xl">Edit Supply</DialogTitle>
                <DialogDescription className="text-sm">
                  Update the supply information
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditSupply} className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Supply Details */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Supply Category</label>
                    <Select
                      value={editSupply.cluster}
                      onValueChange={(value) => setEditSupply({ ...editSupply, cluster: value })}
                      required
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {clusters.map((cluster) => (
                          <SelectItem key={cluster.code} value={cluster.code}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{cluster.name}</span>
                              <span className="text-xs text-gray-500">({cluster.code})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      required
                      className="h-11 text-sm"
                      value={editSupply.name}
                      onChange={(e) => setEditSupply({ ...editSupply, name: e.target.value })}
                      placeholder="Enter supply name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      required
                      type="number"
                      min="0"
                      className="h-11 text-sm"
                      value={editSupply.quantity}
                      onChange={(e) => setEditSupply({ ...editSupply, quantity: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>
                    <Select
                      value={editSupply.unit}
                      onValueChange={(value) => setEditSupply({ ...editSupply, unit: value })}
                      required
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.name}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewUnitDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New Unit
                  </Button>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button type="submit" size="lg" className="w-full h-11 text-sm" disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating Supply...
                      </div>
                    ) : (
                      "Update Supply"
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supply
              "{selectedSupply?.name}" from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 