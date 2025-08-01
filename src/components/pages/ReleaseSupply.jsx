import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "../ui/card";
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
import { toast } from "sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

import { cn } from "../../lib/utils";
import { 
  collection, 
  Timestamp,
  runTransaction,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  where
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Search, Plus, Package, Share2, History, Users, ArrowRight, Edit, Filter, Calendar, ArrowUpDown, Check, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { useReleases } from "../../lib/ReleaseContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";

export function ReleaseSupply() {
  const { releases, supplies, stats, isLoading: isContextLoading } = useReleases();
  const [filteredReleases, setFilteredReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSupplies, setSelectedSupplies] = useState([]);
  const [open, setOpen] = useState(false);
  const [commandInputValue, setCommandInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [sortField, setSortField] = useState('supplyName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [newRelease, setNewRelease] = useState({
    receivedBy: "",
    department: "",
    purpose: ""
  });

  const [showRecipientSuggestions, setShowRecipientSuggestions] = useState(false);
  const [filteredRecipients, setFilteredRecipients] = useState([]);

  // Get unique previous recipients for autocomplete - memoized to prevent infinite loops
  const previousRecipients = React.useMemo(() => {
    return [...new Set(releases.map(release => release.receivedBy).filter(Boolean))];
  }, [releases]);

  // Pagination logic
  const totalPages = Math.ceil(filteredReleases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReleases = filteredReleases.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDate, sortField, sortOrder]);

  // Handle recipient autocomplete with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const query = newRelease.receivedBy.trim();
      if (query) {
        const filtered = previousRecipients.filter(recipient =>
          recipient.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredRecipients(filtered);
        setShowRecipientSuggestions(filtered.length > 0);
      } else {
        setShowRecipientSuggestions(false);
        setFilteredRecipients([]);
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [newRelease.receivedBy, previousRecipients]);

  // Highlight matching text in suggestions
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 font-semibold">
          {part}
        </span>
      ) : part
    );
  };

  // Debug logs
  console.log('ReleaseSupply Component:', {
    contextData: { releasesCount: releases.length, suppliesCount: supplies.length, stats },
    filteredData: filteredReleases.length,
    loading: isContextLoading
  });

  // Initialize filteredReleases when releases changes
  useEffect(() => {
    setFilteredReleases(releases);
  }, [releases]);

  // Multi-field sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  // Modified search effect to include date filtering
  useEffect(() => {
    let filtered = releases;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(release => 
        release.id.toLowerCase().includes(searchLower) || 
        release.supplyName.toLowerCase().includes(searchLower) || 
        release.receivedBy.toLowerCase().includes(searchLower) ||
        release.department.toLowerCase().includes(searchLower)
      );
    }

    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter(release => {
        const releaseDate = release.createdAt?.toDate();
        return releaseDate >= startOfDay && releaseDate <= endOfDay;
      });
    }

    // Multi-field sort logic
    filtered = [...filtered].sort((a, b) => {
      let compareA, compareB;
      switch (sortField) {
        case 'id':
          compareA = a.id;
          compareB = b.id;
          break;
        case 'supplyName':
          compareA = (a.supplyName || '').toLowerCase();
          compareB = (b.supplyName || '').toLowerCase();
          break;
        case 'quantity':
          compareA = parseInt(a.quantity);
          compareB = parseInt(b.quantity);
          break;
        case 'receivedBy':
          compareA = (a.receivedBy || '').toLowerCase();
          compareB = (b.receivedBy || '').toLowerCase();
          break;
        case 'department':
          compareA = (a.department || '').toLowerCase();
          compareB = (b.department || '').toLowerCase();
          break;
        case 'purpose':
          compareA = (a.purpose || '').toLowerCase();
          compareB = (b.purpose || '').toLowerCase();
          break;
        case 'createdAt':
          compareA = a.createdAt?.toDate().getTime() || 0;
          compareB = b.createdAt?.toDate().getTime() || 0;
          break;
        default:
          compareA = a[sortField];
          compareB = b[sortField];
      }
      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    console.log('Filtered results:', filtered.length);
    setFilteredReleases(filtered);
  }, [searchTerm, releases, selectedDate, sortField, sortOrder]);

  // Add toggle sort function
  const toggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const handleAddRelease = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (selectedSupplies.length === 0) {
      toast.error("Please select at least one supply");
      setLoading(false);
      return;
    }

    try {
      console.log('Starting release process with supplies:', selectedSupplies);
      console.log('Available supplies from context:', supplies.map(s => ({ id: s.id, name: s.name })));
      
      // Start a Firestore transaction
      await runTransaction(db, async (transaction) => {
        // First, get the next release ID with RLS prefix
        const releasesRef = collection(db, "releases");
        const releasesSnapshot = await getDocs(query(releasesRef, orderBy("id", "desc"), limit(1)));
        let nextNumber = 1;
        
        if (!releasesSnapshot.empty) {
          const lastId = releasesSnapshot.docs[0].data().id;
          const lastNumber = parseInt(lastId.split('-')[1]);
          nextNumber = lastNumber + 1;
        }

        // Read all supply documents first using queries instead of direct references
        const supplyQueries = selectedSupplies.map(supply => {
          console.log('Creating query for supply:', {
            supplyId: supply.supplyId,
            supplyName: supply.supplyName
          });
          return query(collection(db, "supplies"), where("id", "==", supply.supplyId));
        });
        
        const supplySnapshots = await Promise.all(supplyQueries.map(q => getDocs(q)));
        const supplyDocs = supplySnapshots.map(snapshot => {
          if (snapshot.empty) {
            return null;
          }
          return snapshot.docs[0]; // Get the first (and should be only) document
        });

        // Validate all supplies and calculate new availabilities
        const supplyUpdates = [];
        const releaseData = [];

        for (let i = 0; i < selectedSupplies.length; i++) {
          const selectedSupply = selectedSupplies[i];
          const supplyDoc = supplyDocs[i];

          console.log(`Processing supply ${i + 1}:`, {
            supplyId: selectedSupply.supplyId,
            supplyName: selectedSupply.supplyName,
            docExists: supplyDoc !== null,
            docData: supplyDoc ? supplyDoc.data() : null,
            docId: supplyDoc ? supplyDoc.id : null
          });

          if (!supplyDoc) {
            throw new Error(`Supply "${selectedSupply.supplyName}" (ID: ${selectedSupply.supplyId}) not found in database!`);
          }

          const supplyData = supplyDoc.data();
          
          // Check if there's enough availability
          const currentQuantity = supplyData.quantity || 0;
          const currentAvailability = supplyData.availability ?? currentQuantity;
          const releaseQuantity = parseInt(selectedSupply.quantity);

          console.log('Availability check:', {
            currentQuantity,
            currentAvailability,
            releaseQuantity,
            supplyName: selectedSupply.supplyName
          });

          if (releaseQuantity > currentAvailability) {
            throw new Error(`Not enough quantity available for "${selectedSupply.supplyName}"! Available: ${currentAvailability}, Requested: ${releaseQuantity}`);
          }

          const newAvailability = currentAvailability - releaseQuantity;

          // Prepare supply update using the actual document reference
          const supplyRef = doc(db, "supplies", supplyDoc.id);
          supplyUpdates.push({
            ref: supplyRef,
            data: {
              availability: newAvailability,
              updatedAt: Timestamp.now()
            }
          });

          // Prepare release data with unique ID for each supply
          const uniqueReleaseId = `RLS-${String(nextNumber + i).padStart(5, '0')}`;
          releaseData.push({
            id: uniqueReleaseId,
            supplyId: selectedSupply.supplyId,
            supplyName: selectedSupply.supplyName,
            quantity: selectedSupply.quantity,
            receivedBy: newRelease.receivedBy,
            department: newRelease.department,
            purpose: newRelease.purpose,
            createdAt: Timestamp.now(),
            status: "released",
            previousAvailability: currentAvailability,
            remainingAvailability: newAvailability
          });
        }

        console.log('Performing updates:', {
          supplyUpdates: supplyUpdates.length,
          releaseData: releaseData.length
        });

        // Now perform all writes
        for (const update of supplyUpdates) {
          transaction.update(update.ref, update.data);
        }

        for (const data of releaseData) {
          const newReleaseRef = doc(collection(db, "releases"));
          transaction.set(newReleaseRef, data);
        }
      });

      setDialogOpen(false);
      setNewRelease({
        receivedBy: "",
        department: "",
        purpose: ""
      });
      setSelectedSupplies([]);
      toast.success(`${selectedSupplies.length} supply(ies) released successfully`);
    } catch (error) {
      console.error("Error releasing supplies:", error);
      toast.error(error.message || "Failed to release supplies");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRelease = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const releaseRef = doc(db, "releases", editingRelease.id);
      await updateDoc(releaseRef, {
        receivedBy: editingRelease.receivedBy,
        department: editingRelease.department,
        purpose: editingRelease.purpose,
        updatedAt: Timestamp.now()
      });

      setEditDialogOpen(false);
      setEditingRelease(null);
      toast.success("Release updated successfully");
    } catch (error) {
      console.error("Error updating release:", error);
      toast.error(error.message || "Failed to update release");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 custom-scrollbar"
      style={{ maxHeight: '100vh', overflowY: 'auto' }}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Release Supply</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track supply releases</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black transition-colors gap-2"
            >
              <Share2 className="w-4 h-4" />
              Release Supply
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Minimalist Header */}
              <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black dark:bg-white rounded-lg">
                    <Share2 className="w-5 h-5 text-white dark:text-black" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold text-black dark:text-white">
                      Release Supply
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
                      Select supplies to release
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                <form onSubmit={handleAddRelease} className="space-y-6">
                  {/* Supply Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-black dark:text-white">
                      Select Supplies
                    </label>
                    
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between h-10 border border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white transition-colors"
                        >
                          <span className={selectedSupplies.length > 0 ? "text-black dark:text-white" : "text-gray-500"}>
                            {selectedSupplies.length > 0
                              ? `${selectedSupplies.length} supply(ies) selected`
                              : "Select supplies..."}
                          </span>
                          <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[450px] p-0" align="start">
                        <Command className="rounded-lg">
                          <CommandInput
                            placeholder="Search supplies..."
                            value={commandInputValue}
                            onValueChange={setCommandInputValue}
                            className="h-10"
                          />
                          <CommandEmpty className="py-6 text-center">
                            <Package className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-500 text-sm">No supplies found</p>
                          </CommandEmpty>
                          <CommandGroup className="max-h-[250px] overflow-auto custom-scrollbar">
                            {supplies.map((supply) => {
                              // The supply object has both Firestore doc ID and custom ID field, both called 'id'
                              // We need to distinguish between them
                              const firestoreDocId = supply.id; // This is the Firestore document ID
                              const customIdField = supply.id; // This is the custom ID field from document data
                              const isSelected = selectedSupplies.some(s => s.supplyId === customIdField);
                              
                              console.log('Supply in dropdown:', {
                                firestoreDocId: firestoreDocId,
                                customIdField: customIdField,
                                name: supply.name,
                                allFields: Object.keys(supply),
                                // Check if there are two different 'id' fields
                                hasCustomId: supply.id !== undefined,
                                supplyObject: supply
                              });
                              
                              return (
                                <CommandItem
                                  key={firestoreDocId}
                                  onSelect={() => {
                                    if (isSelected) {
                                      setSelectedSupplies(prev => prev.filter(s => s.supplyId !== customIdField));
                                    } else {
                                      console.log('Adding supply to selection:', {
                                        supplyId: customIdField,
                                        supplyName: supply.name,
                                        firestoreDocId: firestoreDocId
                                      });
                                      setSelectedSupplies(prev => [...prev, {
                                        supplyId: customIdField, // Use custom ID field for querying
                                        supplyName: supply.name,
                                        quantity: "1"
                                      }]);
                                    }
                                  }}
                                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    <div className="flex-shrink-0">
                                      {supply.image ? (
                                        <img
                                          src={supply.image}
                                          alt={supply.name}
                                          className="w-8 h-8 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                          <Package className="w-4 h-4 text-gray-500" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-black dark:text-white truncate">{supply.name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500">
                                          Available: {supply.availability ?? supply.quantity}
                                        </span>
                                        {supply.classification && (
                                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                            {supply.classification}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4 transition-colors",
                                        isSelected 
                                          ? "opacity-100 text-black dark:text-white" 
                                          : "opacity-0 text-gray-400"
                                      )}
                                    />
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Selected Supplies */}
                  {selectedSupplies.length > 0 && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-black dark:text-white">
                        Selected Supplies ({selectedSupplies.length})
                      </label>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {selectedSupplies.map((selectedSupply, index) => (
                          <div
                            key={selectedSupply.supplyId}
                            className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-black dark:text-white text-sm">{selectedSupply.supplyName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Available: {supplies.find(s => s.id === selectedSupply.supplyId)?.availability ?? supplies.find(s => s.id === selectedSupply.supplyId)?.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max={supplies.find(s => s.id === selectedSupply.supplyId)?.availability ?? supplies.find(s => s.id === selectedSupply.supplyId)?.quantity}
                                value={selectedSupply.quantity}
                                onChange={(e) => {
                                  setSelectedSupplies(prev => prev.map((s, i) => 
                                    i === index ? { ...s, quantity: e.target.value } : s
                                  ));
                                }}
                                className="w-20 h-8 text-center text-sm"
                                placeholder="Qty"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedSupplies(prev => prev.filter((_, i) => i !== index));
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 h-8 w-8"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recipient Information */}
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-black dark:text-white">
                      Recipient Information
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Received By
                        </label>
                        <div className="relative">
                          <Input
                            value={newRelease.receivedBy}
                            onChange={(e) => setNewRelease(prev => ({ ...prev, receivedBy: e.target.value }))}
                            onFocus={() => {
                              if (newRelease.receivedBy.trim() && filteredRecipients.length > 0) {
                                setShowRecipientSuggestions(true);
                              }
                            }}
                            onBlur={() => {
                              // Delay hiding to allow clicking on suggestions
                              setTimeout(() => setShowRecipientSuggestions(false), 200);
                            }}
                            placeholder="Enter recipient name"
                            required
                            className="h-9"
                          />
                          
                          {/* Autocomplete Suggestions */}
                          {showRecipientSuggestions && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                              {filteredRecipients.map((recipient, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    setNewRelease(prev => ({ ...prev, receivedBy: recipient }));
                                    setShowRecipientSuggestions(false);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm">
                                      {highlightMatch(recipient, newRelease.receivedBy)}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Department
                        </label>
                        <Input
                          value={newRelease.department}
                          onChange={(e) => setNewRelease(prev => ({ ...prev, department: e.target.value }))}
                          placeholder="Enter department"
                          required
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Purpose
                      </label>
                      <Input
                        value={newRelease.purpose}
                        onChange={(e) => setNewRelease(prev => ({ ...prev, purpose: e.target.value }))}
                        placeholder="Enter purpose"
                        required
                        className="h-9"
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedSupplies.length > 0 && (
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        {selectedSupplies.length} supply(ies) ready
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      className="px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      onClick={handleAddRelease}
                      disabled={loading || selectedSupplies.length === 0}
                      className="bg-black hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black px-4 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Releasing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4" />
                          Release
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        <Card className="bg-blue-50/50 dark:bg-blue-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Releases</p>
                <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalReleases}</h3>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                <Share2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Today's Releases</p>
                <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.todayReleases}</h3>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full">
                <History className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Unique Recipients</p>
                <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.uniqueRecipients}</h3>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          {/* Search and Filter Section */}
          <div className="flex justify-between items-center gap-4 px-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by supply name, recipient, or department..."
                className="pl-10 text-sm pr-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              {/* Sort By Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 min-w-[140px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort By
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[220px]">
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5">Sort by ID</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('id'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'id' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> Lowest to Highest
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('id'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'id' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Highest to Lowest
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5 mt-2">Sort by Supply Name</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('supplyName'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'supplyName' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> A to Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('supplyName'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'supplyName' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Z to A
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5 mt-2">Sort by Quantity</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('quantity'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'quantity' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> Lowest to Highest
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('quantity'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'quantity' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Highest to Lowest
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5 mt-2">Sort by Received By</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('receivedBy'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'receivedBy' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> A to Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('receivedBy'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'receivedBy' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Z to A
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5 mt-2">Sort by Department</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('department'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'department' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> A to Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('department'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'department' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Z to A
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5 mt-2">Sort by Purpose</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('purpose'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'purpose' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> A to Z
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('purpose'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'purpose' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Z to A
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="font-medium text-sm text-muted-foreground px-2 py-1.5 mt-2">Sort by Date Released</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('createdAt'); setSortOrder('asc'); }}
                    className={cn("gap-2", sortField === 'createdAt' && sortOrder === 'asc' && "bg-accent")}
                  >
                    <ChevronUp className="h-4 w-4" /> Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => { setSortField('createdAt'); setSortOrder('desc'); }}
                    className={cn("gap-2", sortField === 'createdAt' && sortOrder === 'desc' && "bg-accent")}
                  >
                    <ChevronDown className="h-4 w-4" /> Newest First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* End Sort By Dropdown */}
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredReleases.length)} of {filteredReleases.length} releases
                {selectedDate && ` for ${format(selectedDate, 'PP')}`}
                {` (${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className={cn(
            "overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700",
            filteredReleases.length > itemsPerPage && "max-h-[600px] overflow-y-auto custom-scrollbar"
          )}>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-1">ID {renderSortIndicator('id')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('supplyName')}>
                    <div className="flex items-center gap-1">Supply Name {renderSortIndicator('supplyName')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center gap-1">Quantity {renderSortIndicator('quantity')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('receivedBy')}>
                    <div className="flex items-center gap-1">Received By {renderSortIndicator('receivedBy')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('department')}>
                    <div className="flex items-center gap-1">Department {renderSortIndicator('department')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('purpose')}>
                    <div className="flex items-center gap-1">Purpose {renderSortIndicator('purpose')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1">Date Released {renderSortIndicator('createdAt')}</div>
                  </TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {currentReleases.map((release, index) => (
                    <motion.tr
                      key={release.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      <TableCell className="py-3 text-sm font-mono">
                        {release.id}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 font-medium">
                          {release.supplyName}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        <span className="px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 font-medium">
                          {release.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {release.receivedBy}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {release.department}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {release.purpose}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {release.createdAt?.toDate().toLocaleString()}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        <Dialog open={editDialogOpen && editingRelease?.id === release.id} onOpenChange={setEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => setEditingRelease(release)}
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Edit Release</DialogTitle>
                              <DialogDescription>
                                Edit the release details
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleEditRelease} className="space-y-6 py-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Supply Name</label>
                                  <Input
                                    value={editingRelease?.supplyName || ""}
                                    disabled
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Quantity</label>
                                  <Input
                                    value={editingRelease?.quantity || ""}
                                    disabled
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Received By</label>
                                  <Input
                                    required
                                    value={editingRelease?.receivedBy || ""}
                                    onChange={(e) => setEditingRelease(prev => ({ ...prev, receivedBy: e.target.value }))}
                                    placeholder="Enter recipient's name"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Department</label>
                                  <Input
                                    required
                                    value={editingRelease?.department || ""}
                                    onChange={(e) => setEditingRelease(prev => ({ ...prev, department: e.target.value }))}
                                    placeholder="Enter department"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Purpose</label>
                                  <Input
                                    required
                                    value={editingRelease?.purpose || ""}
                                    onChange={(e) => setEditingRelease(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="Enter purpose of release"
                                  />
                                </div>
                              </div>

                              <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Updating Release...
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Edit className="w-4 h-4" />
                                    Update Release
                                  </div>
                                )}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {filteredReleases.length > 0 && (
            <div className="mt-6 flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredReleases.length)} of {filteredReleases.length} releases
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
    </motion.div>
  );
} 
