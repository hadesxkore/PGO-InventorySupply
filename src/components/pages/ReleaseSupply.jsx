import { useState, useEffect } from "react";
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
  limit
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Search, Plus, Package, Share2, History, Users, ArrowRight, Edit, Filter, Calendar, ArrowUpDown, Check } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { useReleases } from "../../lib/ReleaseContext";

export function ReleaseSupply() {
  const { releases, supplies, stats, isLoading: isContextLoading } = useReleases();
  const [filteredReleases, setFilteredReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [open, setOpen] = useState(false);
  const [commandInputValue, setCommandInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const [newRelease, setNewRelease] = useState({
    supplyId: "",
    supplyName: "",
    quantity: "",
    receivedBy: "",
    department: "",
    purpose: ""
  });

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

    // Sort the filtered releases by supply name
    filtered = [...filtered].sort((a, b) => {
      const nameA = (a.supplyName || '').charAt(0).toLowerCase();
      const nameB = (b.supplyName || '').charAt(0).toLowerCase();
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    console.log('Filtered results:', filtered.length);
    setFilteredReleases(filtered);
  }, [searchTerm, releases, selectedDate, sortOrder]);

  // Add toggle sort function
  const toggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  const handleAddRelease = async (e) => {
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

        // Check if there's enough availability
        const currentQuantity = supplyDoc.data().quantity || 0;
        const currentAvailability = supplyDoc.data().availability ?? currentQuantity; // Initialize if not set
        const releaseQuantity = parseInt(newRelease.quantity);

        if (releaseQuantity > currentAvailability) {
          throw new Error("Not enough quantity available!");
        }

        const newAvailability = currentAvailability - releaseQuantity;

        // Get the next release ID with RLS prefix
        const releasesRef = collection(db, "releases");
        const releasesSnapshot = await getDocs(query(releasesRef, orderBy("id", "desc"), limit(1)));
        let nextNumber = 1;
        
        if (!releasesSnapshot.empty) {
          const lastId = releasesSnapshot.docs[0].data().id;
          const lastNumber = parseInt(lastId.split('-')[1]);
          nextNumber = lastNumber + 1;
        }
        
        const nextReleaseId = `RLS-${String(nextNumber).padStart(5, '0')}`;

        // Create the release document
        const releaseData = {
          id: nextReleaseId,
          ...newRelease,
          createdAt: Timestamp.now(),
          status: "released",
          previousAvailability: currentAvailability,
          remainingAvailability: newAvailability
        };

        // Update both documents in the transaction
        const newReleaseRef = doc(collection(db, "releases"));
        transaction.set(newReleaseRef, releaseData);
        transaction.update(supplyRef, { 
          availability: newAvailability,
          updatedAt: Timestamp.now()
        });
      });

      setDialogOpen(false);
      setNewRelease({
        supplyId: "",
        supplyName: "",
        quantity: "",
        receivedBy: "",
        department: "",
        purpose: ""
      });
      setSelectedSupply(null);
      toast.success("Supply released successfully");
    } catch (error) {
      console.error("Error releasing supply:", error);
      toast.error(error.message || "Failed to release supply");
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
      className="space-y-6"
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
              variant="secondary"
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700 gap-2"
            >
              <Share2 className="w-4 h-4" />
              Release Supply
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Release Supply
              </DialogTitle>
              <DialogDescription>
                Fill out the form below to release a supply item.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddRelease} className="space-y-6">
              {/* Supply Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Supply
                </label>
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
                        : "Select a supply..."}
                      <Package className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search supplies..."
                        value={commandInputValue}
                        onValueChange={setCommandInputValue}
                      />
                      <CommandEmpty>No supplies found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto">
                        {supplies.map((supply) => (
                          <CommandItem
                            key={supply.id}
                            onSelect={() => {
                              setSelectedSupply(supply.id);
                              setNewRelease(prev => ({
                                ...prev,
                                supplyId: supply.id,
                                supplyName: supply.name
                              }));
                              setOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              {supply.image ? (
                                <img
                                  src={supply.image}
                                  alt={supply.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <Package className="w-5 h-5 text-gray-400" />
                              )}
                              <div>
                                <p className="font-medium">{supply.name}</p>
                                <p className="text-xs text-gray-500">
                                  Available: {supply.availability ?? supply.quantity}
                                </p>
                              </div>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedSupply === supply.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newRelease.quantity}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              {/* Received By */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Received By
                </label>
                <Input
                  value={newRelease.receivedBy}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, receivedBy: e.target.value }))}
                  placeholder="Enter recipient name"
                  required
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <Input
                  value={newRelease.department}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="Enter department"
                  required
                />
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Purpose
                </label>
                <Input
                  value={newRelease.purpose}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Enter purpose"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Releasing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Release Supply
                    </>
                  )}
                </Button>
              </div>
            </form>
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
                Showing {filteredReleases.length} releases
                {selectedDate && ` for ${format(selectedDate, 'PP')}`}
                {` (${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="py-3 text-sm font-semibold">ID</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Supply Name</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Quantity</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Received By</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Department</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Purpose</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Date Released</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredReleases.map((release, index) => (
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
        </div>
      </div>
    </motion.div>
  );
} 