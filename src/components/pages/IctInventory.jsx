import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import useDeviceStore from "@/lib/store/useDeviceStore";

const deviceTypes = ["Desktop", "Laptop", "Tablet", "Other"];
const ramSizes = ["4GB", "8GB", "16GB", "32GB", "64GB"];
const storageTypes = ["SSD", "HDD"];
const storageSizes = ["256GB", "512GB", "1TB", "2TB", "4TB"];
const defaultPeripheralOptions = [
  "Keyboard",
  "Mouse",
  "Webcam",
  "Headset",
  "Speakers",
  "External Monitor",
  "Printer",
  "Scanner",
  "UPS",
  "External Hard Drive"
];

export function IctInventory() {
  const { devices, loading, error, fetchDevices, addDevice, updateDevice, deleteDevice } = useDeviceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeripherals, setSelectedPeripherals] = useState([]);
  const [isCustomPeripheralModalOpen, setIsCustomPeripheralModalOpen] = useState(false);
  const [customPeripheral, setCustomPeripheral] = useState("");
  const [peripheralOptions, setPeripheralOptions] = useState([...defaultPeripheralOptions]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
        deviceType: "",
        brandModel: "",
        serialNumber: "",
    assignedTo: "",
        department: "",
        position: "",
        dateAssigned: "",
    location: "",

        processor: "",
        ramSize: "",
        storageType: "",
        storageSize: "",
        graphicsCard: "",
        monitorSize: "",
        monitorBrand: "",
    peripherals: "",
      });
      
  useEffect(() => {
      fetchDevices();
  }, [fetchDevices]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePeripheralToggle = (peripheral) => {
    setSelectedPeripherals((prev) => {
      const newPeripherals = prev.includes(peripheral)
        ? prev.filter(p => p !== peripheral)
        : [...prev, peripheral];
      
      setFormData(prev => ({
        ...prev,
        peripherals: newPeripherals.join(", ")
      }));

      return newPeripherals;
    });
  };

  const handleAddCustomPeripheral = () => {
    if (customPeripheral.trim()) {
      const newPeripheral = customPeripheral.trim();
      // Add to peripheral options list (real-time, not database)
      setPeripheralOptions(prev => [...prev, newPeripheral]);
      // Add to selected peripherals
      setSelectedPeripherals((prev) => {
        const newPeripherals = [...prev, newPeripheral];
        setFormData(prev => ({
      ...prev,
          peripherals: newPeripherals.join(", ")
        }));
        return newPeripherals;
      });
      setCustomPeripheral("");
      setIsCustomPeripheralModalOpen(false);
      toast.success(`Added custom peripheral: ${newPeripheral}`);
    }
  };



  const handleDelete = async (deviceId) => {
    try {
      await deleteDevice(deviceId);
      toast.success("Device deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete device: " + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDevice(formData);
      toast.success("Device added successfully!");
      resetForm();
    } catch (error) {
      toast.error("Failed to save device: " + error.message);
    }
  };

  const resetForm = () => {
    setSelectedPeripherals([]);
        setFormData({
          deviceType: "",
          brandModel: "",
          serialNumber: "",
          processor: "",
          ramSize: "",
          storageType: "",
          storageSize: "",
          graphicsCard: "",
          monitorSize: "",
          monitorBrand: "",
      peripherals: "",
    });
  };

  return (
    <div className="container mx-auto p-6 min-h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ICT Inventory Management</h1>
      </div>

      <Tabs defaultValue="add" className="w-full flex-1">
        <div className="border rounded-lg p-1 mb-8">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="add" className="data-[state=active]:bg-background">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 mr-2"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add New Device
            </TabsTrigger>
            <TabsTrigger value="view" className="data-[state=active]:bg-background">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 mr-2"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              View Devices
            </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="add" className="space-y-4 flex-1">
          <div className="grid gap-6 h-full">
            <form onSubmit={handleSubmit}>
              {/* Basic Information Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 mr-2"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="M6 8h4" />
                      <path d="M6 12h4" />
                      <path d="M6 16h4" />
                    </svg>
                    Basic Information
                  </CardTitle>
                  <CardDescription>Enter the basic details of the device</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 mr-2"
                        >
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="M6 8h4" />
                          <path d="M6 12h4" />
                          <path d="M6 16h4" />
                        </svg>
                        Device Details
                      </h3>
                      <div className="grid gap-4 mt-4">
                        <div className="grid gap-2">
                          <Label htmlFor="deviceType">Device Type</Label>
                  <Select
                    value={formData.deviceType}
                            onValueChange={(value) => handleSelectChange("deviceType", value)}
                            required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                              {deviceTypes.map((type) => (
                                <SelectItem key={type} value={type.toLowerCase()}>
                                  {type}
                                </SelectItem>
                              ))}
                    </SelectContent>
                  </Select>
                </div>

                        <div className="grid gap-2">
                          <Label htmlFor="brandModel">Brand & Model</Label>
                  <Input
                    id="brandModel"
                            name="brandModel"
                    value={formData.brandModel}
                            onChange={handleInputChange}
                            placeholder="e.g., Dell XPS 15"
                            required
                  />
                </div>

                        <div className="grid gap-2">
                          <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                            name="serialNumber"
                    value={formData.serialNumber}
                            onChange={handleInputChange}
                            placeholder="Enter serial number"
                            required
                  />
                </div>
              </div>
              </div>

                    <div className="border-l pl-8">
                      <h3 className="text-sm font-medium mb-3 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 mr-2"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        User Assignment
                      </h3>
                      <div className="grid gap-4 mt-4">
                        <div className="grid gap-2">
                          <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                            id="assignedTo"
                            name="assignedTo"
                            value={formData.assignedTo}
                            onChange={handleInputChange}
                            placeholder="Enter user name"
                            required
                  />
                </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                              name="department"
                    value={formData.department}
                              onChange={handleInputChange}
                              placeholder="Enter department"
                              required
                  />
                </div>
                          <div className="grid gap-2">
                            <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                              name="position"
                    value={formData.position}
                              onChange={handleInputChange}
                              placeholder="Enter position"
                              required
                  />
                          </div>
                </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="dateAssigned">Date Assigned</Label>
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={`w-full justify-start text-left font-normal h-9 ${!formData.dateAssigned && "text-muted-foreground"}`}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="mr-2 h-4 w-4"
                                  >
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                    <line x1="16" x2="16" y1="2" y2="6" />
                                    <line x1="8" x2="8" y1="2" y2="6" />
                                    <line x1="3" x2="21" y1="10" y2="10" />
                                  </svg>
                                  {formData.dateAssigned ? format(new Date(formData.dateAssigned), "PPP") : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={formData.dateAssigned ? new Date(formData.dateAssigned) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      // Adjust for timezone to keep the selected date
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      const dateString = `${year}-${month}-${day}`;
                                      handleInputChange({ target: { name: 'dateAssigned', value: dateString }});
                                    } else {
                                      handleInputChange({ target: { name: 'dateAssigned', value: '' }});
                                    }
                                    setCalendarOpen(false);
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                              id="location"
                              name="location"
                              value={formData.location}
                              onChange={handleInputChange}
                              placeholder="Enter location"
                              required
                            />
                          </div>
                </div>

                        
              </div>
          </div>
            </div>
                </CardContent>
              </Card>

              {/* Hardware Specifications Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 mr-2"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M7 7h10" />
                      <path d="M7 12h10" />
                      <path d="M7 17h10" />
                    </svg>
                    Hardware Specifications
                  </CardTitle>
                  <CardDescription>Enter the hardware details of the device</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                <Label htmlFor="processor">Processor (CPU)</Label>
                <Input
                  id="processor"
                        name="processor"
                  value={formData.processor}
                        onChange={handleInputChange}
                        placeholder="e.g., Intel i5-12600K"
                        required
                />
              </div>

                    <div className="grid gap-2">
                <Label htmlFor="ramSize">RAM Size</Label>
                <Select
                  value={formData.ramSize}
                        onValueChange={(value) => handleSelectChange("ramSize", value)}
                        required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select RAM size" />
                  </SelectTrigger>
                  <SelectContent>
                          {ramSizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                  </SelectContent>
                </Select>
              </div>
              </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="storageType">Storage Type</Label>
                  <Select
                    value={formData.storageType}
                        onValueChange={(value) => handleSelectChange("storageType", value)}
                        required
                  >
                    <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                          {storageTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="storageSize">Storage Size</Label>
                  <Select
                    value={formData.storageSize}
                        onValueChange={(value) => handleSelectChange("storageSize", value)}
                        required
                  >
                    <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                          {storageSizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                  <div className="grid gap-2">
                    <Label htmlFor="graphicsCard">Graphics Card</Label>
                    <Input
                      id="graphicsCard"
                      name="graphicsCard"
                      value={formData.graphicsCard}
                      onChange={handleInputChange}
                      placeholder="e.g., NVIDIA RTX 3060"
                    />
            </div>
                </CardContent>
          </Card>

              {/* Display & Peripherals Card */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 mr-2"
                    >
                      <rect width="20" height="14" x="2" y="3" rx="2" />
                      <line x1="8" x2="16" y1="21" y2="21" />
                      <line x1="12" x2="12" y1="17" y2="21" />
                    </svg>
                    Display & Peripherals
                  </CardTitle>
                  <CardDescription>Enter the display and peripheral details</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="monitorSize">Monitor Size</Label>
                  <Input
                        id="monitorSize"
                        name="monitorSize"
                    value={formData.monitorSize}
                        onChange={handleInputChange}
                        placeholder="e.g., 24 inch"
                  />
                </div>
                    <div className="grid gap-2">
                      <Label htmlFor="monitorBrand">Monitor Brand</Label>
                  <Input
                        id="monitorBrand"
                        name="monitorBrand"
                    value={formData.monitorBrand}
                        onChange={handleInputChange}
                        placeholder="e.g., Dell"
                  />
                </div>
              </div>

                  <div className="grid gap-2">
                <Label>Peripherals</Label>
                <div className="flex flex-wrap gap-2">
                      {peripheralOptions.map((peripheral) => (
                    <Button
                      key={peripheral}
                      type="button"
                          variant={selectedPeripherals.includes(peripheral) ? "default" : "outline"}
                          onClick={() => handlePeripheralToggle(peripheral)}
                          className="flex items-center gap-2"
                        >
                          {selectedPeripherals.includes(peripheral) ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : null}
                      {peripheral}
                    </Button>
                  ))}
                  
                                             {/* Custom Peripheral Button */}
                       <Dialog open={isCustomPeripheralModalOpen} onOpenChange={setIsCustomPeripheralModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                             className="flex items-center gap-2 bg-black text-white hover:bg-gray-800 border-0"
                           >
                             <svg
                               xmlns="http://www.w3.org/2000/svg"
                               viewBox="0 0 24 24"
                               fill="none"
                               stroke="currentColor"
                               strokeWidth="2"
                               strokeLinecap="round"
                               strokeLinejoin="round"
                               className="h-4 w-4"
                             >
                               <path d="M12 5v14M5 12h14" />
                             </svg>
                        Add Custom
                      </Button>
                    </DialogTrigger>
                        <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Custom Peripheral</DialogTitle>
                        <DialogDescription>
                              Enter the name of a custom peripheral device
                        </DialogDescription>
                      </DialogHeader>
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                          <Label htmlFor="customPeripheral">Peripheral Name</Label>
                          <Input
                            id="customPeripheral"
                            value={customPeripheral}
                                onChange={(e) => setCustomPeripheral(e.target.value)}
                                placeholder="e.g., USB Hub, Card Reader"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddCustomPeripheral();
                                  }
                                }}
                          />
                        </div>
                            <div className="flex justify-end gap-2">
                        <Button
                                variant="outline"
                          onClick={() => {
                                  setIsCustomPeripheralModalOpen(false);
                              setCustomPeripheral("");
                          }}
                        >
                                Cancel
                              </Button>
                              <Button onClick={handleAddCustomPeripheral}>
                          Add Peripheral
                        </Button>
                            </div>
                          </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
                </CardContent>
          </Card>

              <div className="flex justify-end gap-4">
            <Button 
              type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Reset
            </Button>
                <Button type="submit" className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Device
            </Button>
          </div>
        </form>
          </div>
        </TabsContent>

        <TabsContent value="view" className="flex-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Device List
              </CardTitle>
              <div className="flex items-center space-x-2">
                  <Input
                  placeholder="Search devices..."
                  className="w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px]">Device Type</TableHead>
                      <TableHead>Brand & Model</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Date Assigned</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices
                      .filter((device) => {
                        if (!searchQuery) return true;
                        const searchLower = searchQuery.toLowerCase();
                        return (
                          device.deviceType?.toLowerCase().includes(searchLower) ||
                          device.brandModel?.toLowerCase().includes(searchLower) ||
                          device.serialNumber?.toLowerCase().includes(searchLower) ||
                          device.assignedTo?.toLowerCase().includes(searchLower) ||
                          device.department?.toLowerCase().includes(searchLower) ||
                          device.position?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((device) => (
                        <TableRow key={device.id} className="hover:bg-muted/50">
                        <TableCell>
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm">
                            {device.deviceType}
                            </span>
                        </TableCell>
                        <TableCell>{device.brandModel}</TableCell>
                        <TableCell>
                            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-mono text-sm">
                              {device.serialNumber}
                            </span>
                        </TableCell>
                        <TableCell>
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-sm">
                              {device.assignedTo || "Unassigned"}
                            </span>
                        </TableCell>
                          <TableCell>{device.department || "N/A"}</TableCell>
                        <TableCell>
                            <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-sm">
                              {device.position || "N/A"}
                            </span>
                        </TableCell>
                          <TableCell className="text-sm">
                            {device.dateAssigned ? new Date(device.dateAssigned).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="flex items-center gap-2 px-3 py-1 h-8 text-sm"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                      </svg>
                                      View Specs
                                    </Button>
                                  </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <span className="text-muted-foreground font-normal">{device.deviceType}</span>
                                    {device.brandModel}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Serial Number: {device.serialNumber}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 pt-4">
                                  <div className="space-y-4">
                                    <div>
                                      <h3 className="text-sm font-semibold mb-3">Hardware Specifications</h3>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Processor:</span>
                                          <span className="ml-2">{device.processor || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">RAM:</span>
                                          <span className="ml-2">{device.ramSize || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Storage:</span>
                                          <span className="ml-2">{device.storageType && device.storageSize ? `${device.storageType} ${device.storageSize}` : "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Graphics Card:</span>
                                          <span className="ml-2">{device.graphicsCard || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="border-t pt-4">
                                      <h3 className="text-sm font-semibold mb-3">Display Information</h3>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Monitor Size:</span>
                                          <span className="ml-2">{device.monitorSize || "N/A"}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Monitor Brand:</span>
                                          <span className="ml-2">{device.monitorBrand || "N/A"}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="border-t pt-4">
                                      <h3 className="text-sm font-semibold mb-3">Connected Peripherals</h3>
                                      <div className="flex flex-wrap gap-1">
                                        {device.peripherals && typeof device.peripherals === 'string' && device.peripherals.trim() !== '' ? (
                                          device.peripherals.split(", ").map((peripheral, index) => (
                                            <span
                                              key={index}
                                              className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                                            >
                                              {peripheral}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-muted-foreground text-sm">No peripherals connected</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                                                            <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex items-center gap-2 px-3 py-1 h-8 text-sm bg-red-600 text-white hover:bg-red-700"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <path d="M3 6h18" />
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                      </svg>
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the device from the database.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDelete(device.id)}
                                  >
                                  Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            </div>
                        </TableCell>
                      </TableRow>
                      ))}
                    {devices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan="5" className="text-center h-24">
                          No devices found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}