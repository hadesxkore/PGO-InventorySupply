import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Card } from "../ui/card";
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
import { cn } from "../../lib/utils";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  runTransaction,
  doc,
  addDoc,
  getDocs,
  updateDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Search, Plus, Package, Share2, History, Users, ArrowRight, Edit, Filter, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "../ui/calendar";

export function ReleaseSupply() {
  const [allReleases, setAllReleases] = useState([]);
  const [filteredReleases, setFilteredReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [supplies, setSupplies] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [commandInputValue, setCommandInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [stats, setStats] = useState({
    totalReleases: 0,
    todayReleases: 0,
    uniqueRecipients: 0
  });

  const [newRelease, setNewRelease] = useState({
    supplyId: "",
    supplyName: "",
    quantity: "",
    receivedBy: "",
    department: "",
    purpose: ""
  });

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

  // Fetch releases
  useEffect(() => {
    const q = query(collection(db, "releases"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const releasesData = [];
      snapshot.forEach((doc) => {
        releasesData.push({ id: doc.id, ...doc.data() });
      });
      setAllReleases(releasesData);
      setFilteredReleases(releasesData);
      
      // Update stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const uniqueRecipients = new Set(releasesData.map(r => r.receivedBy)).size;
      
      setStats({
        totalReleases: releasesData.length,
        todayReleases: releasesData.filter(d => d.createdAt?.toDate().getTime() >= today).length,
        uniqueRecipients
      });
    });

    return () => unsubscribe();
  }, []);

  // Modified search effect to include date filtering
  useEffect(() => {
    let filtered = allReleases;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(release => 
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
    
    setFilteredReleases(filtered);
  }, [searchTerm, allReleases, selectedDate]);

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

        // Check if there's enough quantity
        const currentQuantity = supplyDoc.data().quantity || 0;
        const releaseQuantity = parseInt(newRelease.quantity);

        if (releaseQuantity > currentQuantity) {
          throw new Error("Not enough quantity available!");
        }

        const newQuantity = currentQuantity - releaseQuantity;

        // Get the next release ID
        const releasesRef = collection(db, "releases");
        const releasesSnapshot = await getDocs(releasesRef);
        const releaseCount = releasesSnapshot.size;
        const nextReleaseId = String(releaseCount + 1).padStart(5, '0');

        // Create the release document
        const releaseData = {
          id: nextReleaseId,
          ...newRelease,
          createdAt: Timestamp.now(),
          status: "released"
        };

        // Update both documents in the transaction
        const newReleaseRef = doc(collection(db, "releases"));
        transaction.set(newReleaseRef, releaseData);
        transaction.update(supplyRef, { 
          quantity: newQuantity,
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
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Release Supply
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Share2 className="w-4 h-4" />
                Release Supply
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Release Supply</DialogTitle>
                <DialogDescription>
                  Release a supply item to a recipient
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRelease} className="space-y-6 py-4">
                <div className="space-y-4">
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
                                      setNewRelease(prev => ({
                                        ...prev,
                                        supplyId: supply.id,
                                        supplyName: supply.name
                                      }));
                                      setOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span>{supply.name}</span>
                                      <span className="text-sm text-gray-500">
                                        Available: {supply.quantity}
                                      </span>
                                    </div>
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
                                    setNewRelease(prev => ({
                                      ...prev,
                                      supplyId: supply.id,
                                      supplyName: supply.name
                                    }));
                                    setOpen(false);
                                  }}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>{supply.name}</span>
                                    <span className="text-sm text-gray-500">
                                      Available: {supply.quantity}
                                    </span>
                                  </div>
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
                      min="1"
                      required
                      value={newRelease.quantity}
                      onChange={(e) => setNewRelease(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Enter quantity to release"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Received By</label>
                    <Input
                      required
                      value={newRelease.receivedBy}
                      onChange={(e) => setNewRelease(prev => ({ ...prev, receivedBy: e.target.value }))}
                      placeholder="Enter recipient's name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Input
                      required
                      value={newRelease.department}
                      onChange={(e) => setNewRelease(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Enter department"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purpose</label>
                    <Input
                      required
                      value={newRelease.purpose}
                      onChange={(e) => setNewRelease(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="Enter purpose of release"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Releasing Supply...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Release Supply
                    </div>
                  )}
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
            <Card className="p-8 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/40 border-none relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Releases</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {stats.totalReleases}
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                  <Share2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-8 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-800/40 border-none relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Releases</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {stats.todayReleases}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
                  <History className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-8 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-800/40 border-none relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Unique Recipients</h3>
                  <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white">
                    {stats.uniqueRecipients}
                  </p>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-full">
                  <Users className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mt-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center gap-4">
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
                      transition={{ duration: 0.3, delay: index * 0.05 }}
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
    </div>
  );
} 