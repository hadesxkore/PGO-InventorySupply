import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DatePickerWithRange } from "../ui/date-range-picker";
import { addDays, format } from "date-fns";
import { collection, query, orderBy, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { FileText, FileIcon, Download, Calendar, ArrowUpDown } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React from "react"; // Added missing import for React

export function Reports() {
  const [reportType, setReportType] = useState("supplies");
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('asc');
  const itemsPerPage = 20;

  // Calculate pagination values
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Reset to first page when report type or date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, dateRange]);

  // Sort and paginate data
  const getSortedAndPaginatedData = () => {
    let sortedData = [...reportData];
    
    // Sort based on name/supplyName depending on report type
    sortedData.sort((a, b) => {
      let valueA = '';
      let valueB = '';
      
      if (reportType === 'supplies') {
        valueA = (a.Name || '').toLowerCase();
        valueB = (b.Name || '').toLowerCase();
      } else {
        valueA = (a['Supply Name'] || '').toLowerCase();
        valueB = (b['Supply Name'] || '').toLowerCase();
      }
      
      return sortOrder === 'asc' 
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });

    return sortedData.slice(startIndex, endIndex);
  };

  const toggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  // Modify the fetch report data function
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        let collectionName = "";
        switch (reportType) {
          case "supplies":
            collectionName = "supplies";
            break;
          case "deliveries":
            collectionName = "deliveries";
            break;
          case "releases":
            collectionName = "releases";
            break;
          default:
            collectionName = "supplies";
        }

        const startDate = Timestamp.fromDate(dateRange.from);
        const endDate = Timestamp.fromDate(dateRange.to);

        const q = query(
          collection(db, collectionName),
          where("createdAt", ">=", startDate),
          where("createdAt", "<=", endDate),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        let data = [];

        if (reportType === "supplies") {
          data = snapshot.docs.map(doc => ({
            ID: doc.id,
            Name: doc.data().name || '-',
            Quantity: doc.data().quantity || 0,
            Unit: doc.data().unit || 'pcs',
            Cluster: doc.data().cluster || '-',
            "Date Added": doc.data().createdAt?.toDate().toLocaleString() || '-'
          }));
        } else if (reportType === "deliveries") {
          data = snapshot.docs.map(doc => ({
            ID: doc.id,
            "Supply Name": doc.data().supplyName || '-',
            Quantity: doc.data().quantity || 0,
            "Delivered By": doc.data().deliveredBy || '-',
            Notes: doc.data().notes || '-',
            "Date & Time": doc.data().createdAt?.toDate().toLocaleString() || '-'
          }));
        } else if (reportType === "releases") {
          data = snapshot.docs.map(doc => ({
            ID: doc.id,
            "Supply Name": doc.data().supplyName || '-',
            Quantity: doc.data().quantity || 0,
            "Received By": doc.data().receivedBy || '-',
            Department: doc.data().department || '-',
            Purpose: doc.data().purpose || '-',
            "Date Released": doc.data().createdAt?.toDate().toLocaleString() || '-'
          }));
        }

        setReportData(data);
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [reportType, dateRange]);

  // Generate Excel report
  const generateExcel = () => {
    try {
      // Filter out the date column from the data
      const filteredData = reportData.map(item => {
        const { ['Date Added']: dateAdded, ...rest } = item;
        return rest;
      });

      const worksheet = XLSX.utils.json_to_sheet(filteredData);
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
      const filteredData = reportData.map(item => {
        const { ['Date Added']: dateAdded, ...rest } = item;
        return rest;
      });
      
      const headers = Object.keys(filteredData[0] || {});
      const data = filteredData.map(item => Object.values(item));
      
      // Calculate table width (total of column widths)
      const tableWidth = 160; // Slightly reduced width
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
          0: { cellWidth: 28 }, // ID
          1: { cellWidth: 45 }, // Name/Supply Name
          2: { cellWidth: 29 }, // Quantity
          3: { cellWidth: 29 }, // Unit
          4: { cellWidth: 29 }, // Cluster
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
        <Card className="p-4">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
            Report Type
          </label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supplies">Supplies Report</SelectItem>
              <SelectItem value="deliveries">Deliveries Report</SelectItem>
              <SelectItem value="releases">Releases Report</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {/* Date Range Selection */}
        <Card className="p-4 col-span-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">
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
              disabled={loading || reportData.length === 0}
              className="flex-1 gap-2"
            >
              <FileText className="w-4 h-4" />
              Excel
            </Button>
            <Button
              onClick={generatePDF}
              disabled={loading || reportData.length === 0}
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
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Report Preview
            </h2>
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
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, reportData.length)} of {reportData.length} items
                {` (${sortOrder === 'asc' ? 'A-Z' : 'Z-A'})`}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading report data...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No data available for the selected criteria
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(reportData[0]).map((header) => (
                        <TableHead key={header}>
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedAndPaginatedData().map((row, index) => (
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
              {totalPages > 1 && (
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
} 