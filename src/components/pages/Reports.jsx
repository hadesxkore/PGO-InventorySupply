import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DatePickerWithRange } from "../ui/date-range-picker";
import { format } from "date-fns";
import { clusters } from "../../lib/firebase";
import { FileText, FileIcon, Download, Calendar, ArrowUpDown, Filter, Search, Package, ArrowUpRight, ChevronUp, ChevronDown } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React from "react";
import { useReports } from "../../lib/ReportsContext";

export function Reports() {
  const { reportsData, isLoading, dateRange, setDateRange } = useReports();
  const [reportType, setReportType] = useState("supplies");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;

  // Debug logs
  console.log('Reports Context Data:', { reportsData, isLoading, dateRange });
  console.log('Reports Component State:', { 
    reportType, 
    currentPage, 
    sortField, 
    sortOrder, 
    selectedCluster, 
    searchTerm,
    currentData: reportsData[reportType] || []
  });

  // Get current report data based on type
  const getCurrentReportData = () => {
    const data = reportsData[reportType] || [];
    console.log(`Current ${reportType} data:`, data.length, 'items');
    return data;
  };

  // Filter and sort data
  const getFilteredData = () => {
    const currentData = getCurrentReportData();
    const filtered = currentData.filter(item => {
      const matchesSearch = searchTerm === '' || 
        (item.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item['Supply Name']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.ID?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCluster = selectedCluster === 'all' || item.Cluster === selectedCluster;

      return matchesSearch && matchesCluster;
    });
    
    console.log('Filtered data:', {
      before: currentData.length,
      after: filtered.length,
      searchTerm,
      selectedCluster
    });

    return filtered;
  };

  // Get sorted and paginated data
  const getSortedAndPaginatedData = () => {
    const filteredData = getFilteredData();
    
    // Enhanced sorting based on multiple fields
    const sortedData = [...filteredData].sort((a, b) => {
      let compareA, compareB;
      
      switch (sortField) {
        case 'id':
          compareA = a.ID?.toLowerCase() || '';
          compareB = b.ID?.toLowerCase() || '';
          break;
        case 'name':
          compareA = (reportType === 'supplies' ? a.Name : a['Supply Name'])?.toLowerCase() || '';
          compareB = (reportType === 'supplies' ? b.Name : b['Supply Name'])?.toLowerCase() || '';
          break;
        case 'quantity':
          compareA = parseInt(a.Quantity) || 0;
          compareB = parseInt(b.Quantity) || 0;
          break;
        case 'classification':
          compareA = a.Classification?.toLowerCase() || '';
          compareB = b.Classification?.toLowerCase() || '';
          break;
        case 'date':
          compareA = new Date(a['Date Added'] || 0).getTime();
          compareB = new Date(b['Date Added'] || 0).getTime();
          break;
        default:
          compareA = (a[sortField] || '').toLowerCase();
          compareB = (b[sortField] || '').toLowerCase();
      }

      return sortOrder === 'asc' ? 
        (compareA > compareB ? 1 : -1) : 
        (compareA < compareB ? 1 : -1);
    });

    // Calculate pagination
    const totalFilteredItems = sortedData.length;
    const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
    const adjustedCurrentPage = Math.min(currentPage, totalFilteredPages);
    const startIndex = (adjustedCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return {
      data: sortedData.slice(startIndex, endIndex),
      totalItems: totalFilteredItems,
      totalPages: totalFilteredPages,
      currentPage: adjustedCurrentPage
    };
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, dateRange, searchTerm, selectedCluster, sortField, sortOrder]);

  // Function to handle sort changes
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Helper function to render sort indicator
  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  // Generate Excel report
  const generateExcel = () => {
    try {
      const currentData = getCurrentReportData();
      const worksheet = XLSX.utils.json_to_sheet(currentData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      
      const fileName = `${reportType}_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      toast.success('Excel report generated successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel report');
    }
  };

  // Modify the PDF generation function
  const generatePDF = () => {
    try {
      // Create new document with A4 size
      const doc = new jsPDF({
        format: 'a4',
        unit: 'mm'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15; // Reduced top margin
      const footerHeight = 25; // Reserve space for footer
      
      // Add Bataan Logo - moved up
      const logoPath = '/images/bataan-logo.png';
      const logoWidth = 22;
      const logoHeight = 22;
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoPath, 'PNG', logoX, margin - 5, logoWidth, logoHeight);

      // Add Header Text - adjusted spacing
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('REPUBLIC OF THE PHILIPPINES', pageWidth / 2, margin + 22, { align: 'center' });
      doc.setFontSize(10);
      doc.text('PROVINCIAL GOVERNMENT OF BATAAN', pageWidth / 2, margin + 28, { align: 'center' });
      doc.setFontSize(9);
      doc.text('OFFICE OF THE PROVINCIAL GOVERNOR', pageWidth / 2, margin + 34, { align: 'center' });
      
      // Add Report Title - adjusted spacing
      doc.setFontSize(12);
      doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, pageWidth / 2, margin + 45, { align: 'center' });
      
      // Add Date Range - adjusted spacing
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date Range: ${format(dateRange.from, 'MMM dd, yyyy')} to ${format(dateRange.to, 'MMM dd, yyyy')}`, pageWidth / 2, margin + 52, { align: 'center' });
      
      // Prepare table data without the date column
      const filteredData = getCurrentReportData().map(item => {
        const { ['Date Added']: dateAdded, ...rest } = item;
        return rest;
      });
      
      const headers = Object.keys(filteredData[0] || {});
      const data = filteredData.map(item => Object.values(item));
      
      // Calculate table width (total of column widths)
      const tableWidth = 180; // Increased width to accommodate new column
      const tableX = (pageWidth - tableWidth) / 2; // Center the table

      // Add table with footer space consideration - adjusted start position
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: margin + 60,
        margin: { left: tableX, bottom: footerHeight },
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          halign: 'center',
          valign: 'middle',
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          textColor: [255, 255, 255],
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 25 }, // ID
          1: { cellWidth: 40 }, // Name/Supply Name
          2: { cellWidth: 35 }, // Classification
          3: { cellWidth: 25 }, // Quantity
          4: { cellWidth: 25 }, // Unit/Other fields
          5: { cellWidth: 30 }, // Cluster/Other fields
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        tableWidth: tableWidth,
        theme: 'grid',
        bodyStyles: {
          lineWidth: 0.1,
        },
        didDrawPage: function (data) {
          // Add footer on each page
          const footerY = pageHeight - 15;
          
          // Add line above footer
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
          
          // Add footer text
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text('OFFICE OF THE PROVINCIAL GOVERNOR', pageWidth / 2, footerY, { align: 'center' });
          
          const currentDate = new Date();
          const formattedDateTime = format(currentDate, "MMMM dd, yyyy 'at' hh:mm a");
          doc.text(`Generated on ${formattedDateTime}`, pageWidth / 2, footerY + 4, { align: 'center' });
          
          // Add page number
          doc.text(`Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - margin, footerY, { align: 'right' });
        }
      });
      
      const fileName = `${reportType}_report_${format(dateRange.from, 'yyyy-MM-dd')}_to_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('PDF report generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reports</h1>
        <p className="text-gray-600 dark:text-gray-300">Generate and export inventory reports</p>
      </motion.div>

      {/* Controls Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {/* Report Type Selection */}
        <Card className="p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/80 dark:to-blue-900/30 border border-slate-200/60 dark:border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 opacity-40 transform rotate-12" />
          </div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
            Report Type
          </label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supplies">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span>Supplies Report</span>
                </div>
              </SelectItem>
              <SelectItem value="deliveries">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Deliveries Report</span>
                </div>
              </SelectItem>
              <SelectItem value="releases">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Releases Report</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {/* Date Range Selection */}
        <Card className="p-6 col-span-2 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/80 dark:to-slate-800/30 border border-slate-200/60 dark:border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3">
            <Calendar className="w-12 h-12 text-slate-200 dark:text-slate-700 opacity-40 transform rotate-12" />
          </div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
            Date Range
          </label>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </Card>

        {/* Export Buttons */}
        <Card className="p-4">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
            Export As
          </label>
          <div className="flex gap-2">
            <Button
              onClick={generateExcel}
              disabled={isLoading || getCurrentReportData().length === 0}
              className="flex-1 gap-2"
            >
              <FileText className="w-4 h-4" />
              Excel
            </Button>
            <Button
              onClick={generatePDF}
              disabled={isLoading || getCurrentReportData().length === 0}
              className="flex-1 gap-2"
            >
              <FileIcon className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Report Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex-1 text-center">
              Report Preview
            </h2>
            <div className="flex items-center gap-4 flex-1 justify-end">
              {reportType === 'supplies' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-10 w-10",
                        selectedCluster !== 'all' && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      )}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem 
                      onClick={() => setSelectedCluster('all')}
                      className={cn(selectedCluster === 'all' && "bg-blue-50 dark:bg-blue-900/20")}
                    >
                      All Clusters
                    </DropdownMenuItem>
                    {clusters.map((cluster) => (
                      <DropdownMenuItem
                        key={cluster.code}
                        onClick={() => setSelectedCluster(cluster.code)}
                        className={cn(
                          selectedCluster === cluster.code && "bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        <span className="font-medium">{cluster.name}</span>
                        <span className="ml-2 text-xs text-gray-500">({cluster.code})</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleSort('id')}
                className={cn(
                  "h-10 w-10",
                  sortOrder === 'desc' && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                )}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
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
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuItem 
                    className="text-sm text-muted-foreground"
                    disabled
                  >
                    Sort by ID
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('id');
                      setSortOrder('asc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Lowest to Highest</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('id');
                      setSortOrder('desc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Highest to Lowest</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    className="text-sm text-muted-foreground mt-2"
                    disabled
                  >
                    Sort by Name
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('name');
                      setSortOrder('asc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>A to Z</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('name');
                      setSortOrder('desc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Z to A</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    className="text-sm text-muted-foreground mt-2"
                    disabled
                  >
                    Sort by Quantity
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('quantity');
                      setSortOrder('asc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Lowest to Highest</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('quantity');
                      setSortOrder('desc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Highest to Lowest</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    className="text-sm text-muted-foreground mt-2"
                    disabled
                  >
                    Sort by Date Added
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('date');
                      setSortOrder('asc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Oldest First</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortField('date');
                      setSortOrder('desc');
                    }}
                  >
                    <div className="flex items-center">
                      <ChevronDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Newest First</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {(() => {
                  const { totalItems, data } = getSortedAndPaginatedData();
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  return `Showing ${startIndex + 1} to ${startIndex + data.length} of ${totalItems} items ${selectedCluster !== 'all' ? `(Filtered by ${selectedCluster})` : ''} (Sorted by ${sortField} ${sortOrder === 'asc' ? '↑' : '↓'})`;
                })()}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading report data...</p>
            </div>
          ) : getCurrentReportData().length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No data available for the selected criteria
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(getCurrentReportData()[0] || {}).map((header) => (
                        <TableHead key={header}>
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedAndPaginatedData().data.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i}>
                            {value?.toString() || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {getSortedAndPaginatedData().totalPages > 1 && (
                <div className="mt-6 flex justify-end items-center px-4">
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
                      {Array.from({ length: getSortedAndPaginatedData().totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (page === 1 || page === getSortedAndPaginatedData().totalPages) return true;
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
                      onClick={() => setCurrentPage(prev => Math.min(getSortedAndPaginatedData().totalPages, prev + 1))}
                      disabled={currentPage === getSortedAndPaginatedData().totalPages}
                      className="gap-2"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
} 