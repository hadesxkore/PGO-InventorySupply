import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import * as XLSX from 'xlsx';
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
import { 
  addSupply, 
  getSupplies, 
  updateSupply, 
  deleteSupply,
  searchSupplies,
  db,
  clusters,
  addClassification
} from "../../lib/firebase";
import { collection, onSnapshot, query, orderBy, where, addDoc } from "firebase/firestore";
import { Search, Plus, Pencil, Trash2, Package, Boxes, AlertTriangle, XCircle, Calendar, ArrowUpDown, FileText, Check } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Skeleton } from "../ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import React from "react"; // Added missing import for React
import { cn } from "@/lib/utils"; // Added missing import for cn
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Filter } from "lucide-react";

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [classifications, setClassifications] = useState([]);
  const [newClassification, setNewClassification] = useState("");
  const [newClassificationDialogOpen, setNewClassificationDialogOpen] = useState(false);
  const [classificationSearchOpen, setClassificationSearchOpen] = useState(false);
  const [classificationSearchQuery, setClassificationSearchQuery] = useState("");
  
  const [newSupply, setNewSupply] = useState({
    name: "",
    quantity: "",
    unit: "",
    image: "",
    cluster: "",
    classification: "", // Add classification field
  });

  const [editSupply, setEditSupply] = useState({
    id: "",
    name: "",
    quantity: "",
    unit: "",
    image: "",
    cluster: "",
    classification: "", // Add classification field
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Changed from 20 to 15
  const [sortOrder, setSortOrder] = useState('asc'); // Add sort order state
  const [stockFilter, setStockFilter] = useState('all'); // Add stock filter state
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState("");
  
  // Filter units based on search query
  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(unitSearchQuery.toLowerCase())
  );

  // Filter classifications based on search query
  const filteredClassifications = classifications.filter(classification =>
    classification.name.toLowerCase().includes(classificationSearchQuery.toLowerCase())
  );

  // Calculate pagination values
  const totalPages = Math.ceil(filteredSupplies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSupplies = filteredSupplies.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDate]);

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

  // Fetch classifications from Firebase
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

    // Apply stock filter
    switch (stockFilter) {
      case 'low':
        filtered = filtered.filter(supply => supply.quantity > 0 && supply.quantity < 10);
        break;
      case 'out':
        filtered = filtered.filter(supply => supply.quantity === 0);
        break;
      default:
        break;
    }

    // Sort the filtered supplies
    filtered = [...filtered].sort((a, b) => {
      const nameA = a.name.charAt(0).toLowerCase();
      const nameB = b.name.charAt(0).toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
    
    setFilteredSupplies(filtered);
  }, [searchTerm, allSupplies, selectedDate, sortOrder, stockFilter]); // Add stockFilter to dependencies

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

  const handleAddClassification = async (e) => {
    e.preventDefault();
    if (!newClassification.trim()) {
      toast.error("Please enter a classification name");
      return;
    }

    try {
      await addClassification(newClassification);
      setNewClassification("");
      setNewClassificationDialogOpen(false);
      toast.success("Classification added successfully");
    } catch (error) {
      console.error("Error adding classification:", error);
      toast.error("Failed to add classification");
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
      setNewSupply({ name: "", quantity: "", unit: "", image: "", cluster: "", classification: "" });
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
      classification: supply.classification, // Set classification
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

      const updatedData = {
        ...editSupply,
        image: imageUrl,
        quantity: parseInt(editSupply.quantity),
        availability: parseInt(editSupply.quantity),
      };

      const newId = await updateSupply(editSupply.id, updatedData);

      setEditDialogOpen(false);
      setSelectedImage(null);
      toast.success("Supply updated successfully");

      // If the ID changed (due to cluster change), update the selected supply
      if (newId !== editSupply.id) {
        setSelectedSupply(prev => prev?.id === editSupply.id ? { ...prev, id: newId } : prev);
      }
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

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    setLoading(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to array of arrays to get raw data
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Skip the first two rows (empty and "Item" header) and process only column A
      const items = rawData.slice(2).map(row => row[0]).filter(Boolean);
      
      let importCount = 0;
      
      for (const itemName of items) {
        if (itemName && typeof itemName === 'string') {
          const trimmedName = itemName.trim();
          
          // Check if item already exists
          const existingItems = allSupplies.filter(supply => 
            supply.name.toLowerCase() === trimmedName.toLowerCase()
          );

          if (existingItems.length === 0) {
            try {
              await addSupply({
                name: trimmedName,
                quantity: 0, // Default quantity
                unit: "pcs", // Default unit
                cluster: "GEN", // Default cluster
                image: "", // No image by default
                dateAdded: new Date(), // Add current date
              });
              importCount++;
            } catch (error) {
              console.error("Error adding item:", trimmedName, error);
            }
          }
        }
      }

      setImportDialogOpen(false);
      if (importCount > 0) {
        toast.success(`Successfully imported ${importCount} new items`);
      } else {
        toast.info("No new items were imported (items may already exist)");
      }
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error("Failed to import Excel data: " + error.message);
    } finally {
      setLoading(false);
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

  // Add toggle sort function
  const toggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Supplies & Stock
          </h1>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Supply
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1000px] p-0">
                <div className="grid grid-cols-5 min-h-[650px]">
                  {/* Left Column - Image Preview/Upload */}
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col gap-6 border-r border-slate-200 dark:border-slate-800">
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Supply Image</h3>
                      </div>
                      <div className="relative flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30 overflow-hidden group">
                        {selectedImage ? (
                          <>
                            <img
                              src={URL.createObjectURL(selectedImage)}
                              alt="Preview"
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-white border-white hover:text-white hover:border-white"
                                onClick={() => setSelectedImage(null)}
                              >
                                Change Image
                              </Button>
                            </div>
                          </>
                        ) : (
                          <label className="flex-1 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                            <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
                              <Package className="w-8 h-8 text-slate-400" />
                            </div>
                            <div className="text-base font-medium text-slate-900 dark:text-slate-200 mb-1">Drop your image here</div>
                            <div className="text-sm text-slate-500 mb-4">or click to browse</div>
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageChange}
                            />
                          </label>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="font-medium">Supported formats:</span>
                        </div>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li>JPEG, PNG, GIF</li>
                          <li>Maximum size: 5MB</li>
                          <li>Recommended size: 800x800px</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Form Fields */}
                  <div className="col-span-3 p-8">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-200">Add New Supply</DialogTitle>
                      <DialogDescription className="text-base text-slate-500 dark:text-slate-400">
                        Fill in the details below to add a new supply item to the inventory.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddSupply} className="space-y-8">
                  {/* Supply Category Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Category & Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supply Name</label>
                        <Input
                          required
                          className="h-[38px] bg-white dark:bg-slate-900"
                          value={newSupply.name}
                          onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
                          placeholder="Enter supply name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supply Category</label>
                          <Select
                            value={newSupply.cluster}
                            onValueChange={(value) => setNewSupply({ ...newSupply, cluster: value })}
                            required
                          >
                            <SelectTrigger className="h-[38px] bg-white dark:bg-slate-900">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {clusters.map((cluster) => (
                                <SelectItem key={cluster.code} value={cluster.code}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{cluster.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{cluster.code}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Initial Quantity</label>
                          <Input
                            required
                            type="number"
                            min="0"
                            className="h-[38px] bg-white dark:bg-slate-900"
                            value={newSupply.quantity}
                            onChange={(e) => setNewSupply({ ...newSupply, quantity: e.target.value })}
                            placeholder="Enter quantity"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unit & Classification Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Unit & Classification</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit of Measurement</label>
                        <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={unitSearchOpen}
                              className="h-[38px] w-full justify-between bg-white dark:bg-slate-900"
                            >
                              {newSupply.unit || "Select a unit..."}
                              <span className="ml-2 opacity-50">⌄</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search unit..."
                                value={unitSearchQuery}
                                onValueChange={setUnitSearchQuery}
                                className="h-9"
                              />
                              <CommandEmpty>No unit found.</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {filteredUnits.map((unit) => (
                                  <CommandItem
                                    key={unit.id}
                                    value={unit.name}
                                    onSelect={(value) => {
                                      setNewSupply({ ...newSupply, unit: value });
                                      setUnitSearchOpen(false);
                                    }}
                                  >
                                    {unit.name}
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
                          onClick={() => setNewUnitDialogOpen(true)}
                          className="w-full mt-2 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add New Unit
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Classification</label>
                        <Popover open={classificationSearchOpen} onOpenChange={setClassificationSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={classificationSearchOpen}
                              className="h-[38px] w-full justify-between bg-white dark:bg-slate-900"
                            >
                              {newSupply.classification || "Select a classification..."}
                              <span className="ml-2 opacity-50">⌄</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search classification..."
                                value={classificationSearchQuery}
                                onValueChange={setClassificationSearchQuery}
                                className="h-9"
                              />
                              <CommandEmpty>No classification found.</CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {filteredClassifications.map((classification) => (
                                  <CommandItem
                                    key={classification.id}
                                    value={classification.name}
                                    onSelect={(value) => {
                                      setNewSupply({ ...newSupply, classification: value });
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

                      {/* Submit Button */}
                      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                        <Button 
                          type="submit" 
                          size="lg" 
                          className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700" 
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Adding Supply...
                            </div>
                          ) : (
                            <>
                              <Plus className="w-5 h-5 mr-1" />
                              Add Supply
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Import Data
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="text-xl">Import Excel Data</DialogTitle>
                  <DialogDescription>
                    Upload your Excel file to import supply items into the inventory.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* File Upload Zone */}
                  <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 transition-colors hover:border-gray-300 dark:hover:border-gray-700">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-4">
                        <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-1">Drop your Excel file here</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          or click to browse from your computer
                        </p>
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportExcel}
                          className="cursor-pointer max-w-[300px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Information Card */}
                  <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    <div className="p-4 flex gap-3">
                      <div className="shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium text-amber-900 dark:text-amber-400">Important Note</h4>
                        <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc ml-4">
                          <li>Only Excel files (.xlsx, .xls) are supported</li>
                          <li>The system will only import the "Item" column</li>
                          <li>Duplicate items will be skipped automatically</li>
                        </ul>
                      </div>
                    </div>
                  </Card>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      Processing your file...
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
                <label className="text-sm font-medium">Classification Name</label>
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
                placeholder="Search supplies..." 
                className="pl-10 text-sm pr-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-10 w-10",
                      stockFilter !== 'all' && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem 
                    onClick={() => setStockFilter('all')}
                    className={cn(stockFilter === 'all' && "bg-blue-50 dark:bg-blue-900/20")}
                  >
                    All Items
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setStockFilter('low')}
                    className={cn(
                      stockFilter === 'low' && "bg-blue-50 dark:bg-blue-900/20",
                      "text-yellow-600 dark:text-yellow-400"
                    )}
                  >
                    Low Stock
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setStockFilter('out')}
                    className={cn(
                      stockFilter === 'out' && "bg-blue-50 dark:bg-blue-900/20",
                      "text-red-600 dark:text-red-400"
                    )}
                  >
                    Out of Stock
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                Showing {filteredSupplies.length} supplies
                {selectedDate && ` for ${format(selectedDate, 'PP')}`}
                {stockFilter !== 'all' && ` (${stockFilter === 'low' ? 'Low Stock' : 'Out of Stock'})`}
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
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead className="w-[150px]">Classification</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="w-[100px]">Unit</TableHead>
                    <TableHead className="w-[100px]">Cluster</TableHead>
                    <TableHead className="min-w-[180px]">Date Added</TableHead>
                    <TableHead className="w-[180px] text-right pr-4">Actions</TableHead>
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
                          <Skeleton className="h-10 w-10 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-32" />
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
                          <div className="flex gap-2 justify-end">
                            <Skeleton className="h-9 w-9" />
                            <Skeleton className="h-9 w-9" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : currentSupplies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No supplies found
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentSupplies.map((supply) => (
                      <TableRow key={supply.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-mono">{supply.id}</TableCell>
                        <TableCell>
                          {supply.image ? (
                            <img
                              src={supply.image}
                              alt={supply.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 font-medium">
                            {supply.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium">
                            {supply.classification || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2.5 py-1 rounded-md font-medium",
                            supply.quantity === 0 
                              ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" 
                              : supply.quantity < 10
                              ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                              : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                          )}>
                            {supply.quantity}
                          </span>
                        </TableCell>
                        <TableCell>{supply.unit}</TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium">
                            {supply.cluster}
                          </span>
                        </TableCell>
                        <TableCell>
                          {formatDate(supply.dateAdded)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
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

          {/* Pagination */}
          {!isLoading && filteredSupplies.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredSupplies.length)} of {filteredSupplies.length} supplies
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

      {/* Edit Supply Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] p-0">
          <div className="grid grid-cols-5 min-h-[650px]">
            {/* Left Column - Image Preview/Upload */}
            <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col gap-6 border-r border-slate-200 dark:border-slate-800">
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Supply Image</h3>
                </div>
                <div className="relative flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30 overflow-hidden group">
                  {selectedImage || editSupply.image ? (
                    <>
                      <img
                        src={selectedImage ? URL.createObjectURL(selectedImage) : editSupply.image}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-white border-white hover:text-white hover:border-white"
                          onClick={() => {
                            setSelectedImage(null);
                            setEditSupply({ ...editSupply, image: "" });
                          }}
                        >
                          Change Image
                        </Button>
                      </div>
                    </>
                  ) : (
                    <label className="flex-1 w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-4 mb-4">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
                      <div className="text-base font-medium text-slate-900 dark:text-slate-200 mb-1">Drop your image here</div>
                      <div className="text-sm text-slate-500 mb-4">or click to browse</div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="font-medium">Supported formats:</span>
                  </div>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li>JPEG, PNG, GIF</li>
                    <li>Maximum size: 5MB</li>
                    <li>Recommended size: 800x800px</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Column - Form Fields */}
            <div className="col-span-3 p-8">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-200">Edit Supply</DialogTitle>
                <DialogDescription className="text-base text-slate-500 dark:text-slate-400">
                  Update the supply details below
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditSupply} className="space-y-8">
                {/* Category & Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Category & Details</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supply Name</label>
                      <Input
                        required
                        className="h-[38px] bg-white dark:bg-slate-900"
                        value={editSupply.name}
                        onChange={(e) => setEditSupply({ ...editSupply, name: e.target.value })}
                        placeholder="Enter supply name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supply Category</label>
                        <Select
                          value={editSupply.cluster}
                          onValueChange={(value) => setEditSupply({ ...editSupply, cluster: value })}
                          required
                        >
                          <SelectTrigger className="h-[38px] bg-white dark:bg-slate-900">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {clusters.map((cluster) => (
                              <SelectItem key={cluster.code} value={cluster.code}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{cluster.name}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{cluster.code}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Initial Quantity</label>
                        <Input
                          required
                          type="number"
                          min="0"
                          className="h-[38px] bg-white dark:bg-slate-900"
                          value={editSupply.quantity}
                          onChange={(e) => setEditSupply({ ...editSupply, quantity: e.target.value })}
                          placeholder="Enter quantity"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unit & Classification Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">Unit & Classification</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit of Measurement</label>
                      <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={unitSearchOpen}
                            className="h-[38px] w-full justify-between bg-white dark:bg-slate-900"
                          >
                            {editSupply.unit || "Select a unit..."}
                            <span className="ml-2 opacity-50">⌄</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search unit..."
                              value={unitSearchQuery}
                              onValueChange={setUnitSearchQuery}
                              className="h-9"
                            />
                            <CommandEmpty>No unit found.</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-auto">
                              {filteredUnits.map((unit) => (
                                <CommandItem
                                  key={unit.id}
                                  value={unit.name}
                                  onSelect={(value) => {
                                    setEditSupply({ ...editSupply, unit: value });
                                    setUnitSearchOpen(false);
                                  }}
                                >
                                  {unit.name}
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
                        onClick={() => setNewUnitDialogOpen(true)}
                        className="w-full mt-2 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add New Unit
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Classification</label>
                      <Popover open={classificationSearchOpen} onOpenChange={setClassificationSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={classificationSearchOpen}
                            className="h-[38px] w-full justify-between bg-white dark:bg-slate-900"
                          >
                            {editSupply.classification || "Select a classification..."}
                            <span className="ml-2 opacity-50">⌄</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search classification..."
                              value={classificationSearchQuery}
                              onValueChange={setClassificationSearchQuery}
                              className="h-9"
                            />
                            <CommandEmpty>No classification found.</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-auto">
                              {filteredClassifications.map((classification) => (
                                <CommandItem
                                  key={classification.id}
                                  value={classification.name}
                                  onSelect={(value) => {
                                    setEditSupply({ ...editSupply, classification: value });
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

                {/* Submit Button */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating Supply...
                      </div>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-1" />
                        Update Supply
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