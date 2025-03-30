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
      try {
        // Get the token from localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('Authentication failed: Please log in again');
        }

        const response = await fetch(`/api/exports/${exportId}/download`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          // Log the error details for debugging
          const errorText = await response.text();
          console.error('Download error response:', errorText);
          throw new Error(`Download failed: ${response.statusText || 'Server error'}`);
        }

        const blob = await response.blob();
        
        // Get filename from Content-Disposition header if available
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = contentDisposition ? filenameRegex.exec(contentDisposition) : null;
        const filename = matches && matches[1] ? matches[1].replace(/['"]/g, '') : 'export.json';
        
        // Create a download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        
        return true;
      } catch (error) {
        console.error('Download error:', error);
        throw error;
      }
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download the export file. Please try again.",
        variant: "destructive"
      });
    }
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
          <h1 className="text-2xl font-semibold text-white">Export for Whisper Fine-tuning</h1>
          <p className="mt-2 text-sm text-white/70">
            Export verified transcriptions in Whisper-compatible JSON format for model training.
          </p>
        </div>
      </div>

      {/* Export Options */}
      <Card className="mt-6">
        <CardContent className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date Range */}
            <div>
              <Label className="text-base font-medium text-white">Optional Date Range</Label>
              <p className="text-sm text-white/70 mb-2">Leave empty to export all verified transcriptions</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate" className="block text-sm font-medium text-white/70">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={formValues.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    className="mt-1 bg-black/30 border-white/20 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="block text-sm font-medium text-white/70">
                    End Date
                  </Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={formValues.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                    className="mt-1 bg-black/30 border-white/20 text-white"
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
                  className="border-white/30 data-[state=checked]:bg-primary-600"
                />
                <Label htmlFor="includeTimestamps" className="font-medium text-white/70">
                  Include Timestamps
                </Label>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
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
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Export History */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Export History</h2>
        <div className="overflow-hidden shadow ring-1 ring-white/10 rounded-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-black/40">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Export Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  File Size
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Records
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-black/30 divide-y divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary/50" />
                  </td>
                </tr>
              ) : exportHistory && exportHistory.length > 0 ? (
                exportHistory.map((export_) => (
                  <tr key={export_.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {formatDate(export_.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {formatFileSize(export_.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                      {export_.records}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center border-white/20 hover:bg-white/10"
                        onClick={() => downloadExportMutation.mutate(export_.id)}
                        disabled={downloadExportMutation.isPending}
                      >
                        {downloadExportMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Download
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-white/70">
                    No export history found. Generate an export to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
