import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface ExportFormValues {
  startDate: string;
  endDate: string;
  format: "whisper";
  includeTimestamps: boolean;
}

interface ExportHistory {
  id: number;
  filename: string;
  createdAt: string;
  size: number;
  records: number;
  format: string;
  createdBy: string;
}

export function ExportData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formValues, setFormValues] = useState<ExportFormValues>({
    startDate: "",
    endDate: "",
    format: "whisper",
    includeTimestamps: true
  });

  const { data: exportHistory, isLoading } = useQuery<ExportHistory[]>({
    queryKey: ["/api/exports"],
  });

  // Handle form field changes
  const handleChange = (field: keyof ExportFormValues, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate export mutation
  const generateExportMutation = useMutation({
    mutationFn: async (values: ExportFormValues) => {
      setIsGenerating(true);
      // Include additional required parameters for the API
      const payload = {
        ...values,
        exportType: "all_verified",
        includeSpeaker: false,
        includeConfidence: false,
      };
      return apiRequest("POST", "/api/exports", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
      toast({
        title: "Export generated",
        description: "Your export has been successfully generated and is ready for download.",
      });
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  // Download export mutation
  const downloadExportMutation = useMutation({
    mutationFn: async (exportId: number) => {
      // Use a direct fetch with blob response to handle file downloads
      const response = await fetch(`/api/exports/${exportId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to download: ${errorText}`);
      }

      try {
        const blob = await response.blob();
        const filename = response.headers.get("Content-Disposition")?.split("filename=")[1] || "export.json";
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename.replace(/['"]/g, ""));
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download error:", error);
        throw new Error("Failed to process download");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateExportMutation.mutate(formValues);
  };

  // Format file size
  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Export for Whisper Fine-tuning</h1>
          <p className="mt-2 text-sm text-gray-700">
            Export verified transcriptions in Whisper-compatible JSON format for model training.
          </p>
        </div>
      </div>

      {/* Export Options */}
      <Card className="mt-6 bg-white shadow">
        <CardContent className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Range */}
            <div>
              <Label className="text-base font-medium text-gray-900">Optional Date Range</Label>
              <p className="text-sm text-gray-500 mb-2">Leave empty to export all verified transcriptions</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={formValues.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={formValues.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Include Timestamps */}
            <div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeTimestamps"
                  checked={formValues.includeTimestamps}
                  onCheckedChange={(checked) => handleChange("includeTimestamps", !!checked)}
                />
                <Label htmlFor="includeTimestamps" className="font-medium text-gray-700">
                  Include Timestamps
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={generateExportMutation.isPending || isGenerating}
              className="inline-flex items-center"
            >
              {generateExportMutation.isPending || isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Export...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Whisper Export
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Export History */}
      <div className="mt-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Export History</h3>
        <div className="mt-2 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {isLoading ? (
                  <div className="flex justify-center py-8 bg-white">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Export Date
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          File Size
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Records
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {exportHistory && exportHistory.length > 0 ? (
                        exportHistory.map((exportItem) => (
                          <tr key={exportItem.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {formatDate(exportItem.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {formatFileSize(exportItem.size)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {exportItem.records}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Button
                                variant="outline"
                                className="text-primary-600 hover:text-primary-900"
                                onClick={() => downloadExportMutation.mutate(exportItem.id)}
                                disabled={downloadExportMutation.isPending}
                              >
                                {downloadExportMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            No export history found. Generate an export to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
