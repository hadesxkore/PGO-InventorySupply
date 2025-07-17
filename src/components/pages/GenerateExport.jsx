import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  FileIcon,
  FileText,
  Download,
  CalendarIcon,
  Truck
} from "lucide-react";

export function GenerateExport() {
  const exportOptions = [
    {
      title: "Inventory Report",
      description: "Export complete inventory status with current stock levels",
      icon: FileIcon,
      formats: ["Excel", "PDF"],
    },
    {
      title: "Delivery History",
      description: "Export delivery records with dates and status",
      icon: Truck,
      formats: ["Excel", "PDF"],
    },
    {
      title: "Stock Movement",
      description: "Track stock movements and transfers",
      icon: FileText,
      formats: ["Excel", "CSV"],
    },
    {
      title: "Monthly Summary",
      description: "Generate monthly summary reports",
      icon: CalendarIcon,
      formats: ["PDF", "Excel"],
    },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Generate & Export Reports</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Generate and export various reports in different formats
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportOptions.map((option) => (
          <Card key={option.title} className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <option.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  {option.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  {option.description}
                </p>
                <div className="flex gap-2">
                  {option.formats.map((format) => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      {format}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Custom Report Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Custom Report</h2>
        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Generate a custom report by selecting specific parameters and date ranges
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Create Custom Report
          </Button>
        </Card>
      </div>
    </div>
  );
} 