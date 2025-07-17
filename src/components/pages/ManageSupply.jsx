import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "../ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { format } from "date-fns";
import { Search, Calendar } from "lucide-react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

export function ManageSupply() {
  const [allSupplies, setAllSupplies] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Fetch supplies from Firebase
  useEffect(() => {
    const q = query(collection(db, "supplies"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suppliesData = [];
      snapshot.forEach((doc) => {
        suppliesData.push({ id: doc.id, ...doc.data() });
      });
      setAllSupplies(suppliesData);
      setFilteredSupplies(suppliesData);
    });

    return () => unsubscribe();
  }, []);

  // Search and date filter effect
  useEffect(() => {
    let filtered = allSupplies;

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(supply => 
        supply.name.toLowerCase().includes(searchLower) || 
        supply.category?.toLowerCase().includes(searchLower)
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Manage Supply</h1>
      
      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Add New Supply
        </Button>
        <Button variant="outline">
          Import Supplies
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex justify-between items-center gap-4 mb-6">
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

      {/* Supply Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSupplies.map((supply) => (
              <TableRow key={supply.id}>
                <TableCell>{supply.name}</TableCell>
                <TableCell>{supply.category || '-'}</TableCell>
                <TableCell>{supply.quantity}</TableCell>
                <TableCell>{supply.unit}</TableCell>
                <TableCell>
                  {supply.createdAt?.toDate().toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 