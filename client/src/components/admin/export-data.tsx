import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";

const exportFormSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  exportType: z.enum(["all_verified", "selected_files"]),
  format: z.enum(["whisper", "standard", "custom"]),
  includeSpeaker: z.boolean().default(false),
  includeTimestamps: z.boolean().default(true),
  includeConfidence: z.boolean().default(false),
});

type ExportFormValues = z.infer<typeof exportFormSchema>;

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

  // Form setup
  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportFormSchema),
    defaultValues: {
      exportType: "all_verified",
      format: "whisper",
      includeSpeaker: false,
      includeTimestamps: true,
      includeConfidence: false,
    },
  });

  const { data: exportHistory, isLoading } = useQuery<ExportHistory[]>({
    queryKey: ["/api/exports"],
  });

  // Generate export mutation
  const generateExportMutation = useMutation({
    mutationFn: async (values: ExportFormValues) => {
      setIsGenerating(true);
      return apiRequest("POST", "/api/exports", values);
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
      const response = await fetch(`/api/exports/${exportId}/download`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to download export");
      }

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
  const onSubmit = (values: ExportFormValues) => {
    generateExportMutation.mutate(values);
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

  // Get format display name
  const getFormatDisplayName = (format: string): string => {
    switch (format) {
      case "whisper":
        return "Whisper Fine-tuning";
      case "standard":
        return "Standard JSON";
      case "custom":
        return "Custom Format";
      default:
        return format;
    }
  };

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Export Transcription Data</h1>
          <p className="mt-2 text-sm text-gray-700">
            Export verified transcriptions in JSON format for model training.
          </p>
        </div>
      </div>

      {/* Export Options */}
      <Card className="mt-6 bg-white shadow">
        <CardContent className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Export Options</h3>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-6">
            {/* Date Range */}
            <div>
              <Label className="text-base font-medium text-gray-900">Date Range</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    id="startDate"
                    {...form.register("startDate")}
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
                    {...form.register("endDate")}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Export Type */}
            <div>
              <Label className="text-base font-medium text-gray-900">Export Type</Label>
              <RadioGroup
                defaultValue={form.getValues("exportType")}
                onValueChange={(value) => form.setValue("exportType", value as "all_verified" | "selected_files")}
                className="mt-2 space-y-4"
              >
                <div className="flex items-start">
                  <RadioGroupItem value="all_verified" id="all-verified" className="mt-1" />
                  <div className="ml-3 text-sm">
                    <Label htmlFor="all-verified" className="font-medium text-gray-700">
                      All Verified Transcriptions
                    </Label>
                    <p className="text-gray-500">Export all transcriptions that have been verified and approved.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <RadioGroupItem value="selected_files" id="selected-files" className="mt-1" />
                  <div className="ml-3 text-sm">
                    <Label htmlFor="selected-files" className="font-medium text-gray-700">
                      Selected Audio Files
                    </Label>
                    <p className="text-gray-500">Export only transcriptions from specific audio files.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* JSON Format */}
            <div>
              <Label htmlFor="format" className="block text-sm font-medium text-gray-700">
                JSON Format
              </Label>
              <Select
                defaultValue={form.getValues("format")}
                onValueChange={(value) => form.setValue("format", value as "whisper" | "standard" | "custom")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whisper">Whisper Fine-tuning Format</SelectItem>
                  <SelectItem value="standard">Standard JSON</SelectItem>
                  <SelectItem value="custom">Custom Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Metadata */}
            <div>
              <Label className="text-base font-medium text-gray-900">Include Metadata</Label>
              <div className="mt-2 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeSpeaker"
                    checked={form.getValues("includeSpeaker")}
                    onCheckedChange={(checked) => form.setValue("includeSpeaker", checked as boolean)}
                  />
                  <Label htmlFor="includeSpeaker" className="font-medium text-gray-700">
                    Speaker Information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTimestamps"
                    checked={form.getValues("includeTimestamps")}
                    onCheckedChange={(checked) => form.setValue("includeTimestamps", checked as boolean)}
                  />
                  <Label htmlFor="includeTimestamps" className="font-medium text-gray-700">
                    Timestamps
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeConfidence"
                    checked={form.getValues("includeConfidence")}
                    onCheckedChange={(checked) => form.setValue("includeConfidence", checked as boolean)}
                  />
                  <Label htmlFor="includeConfidence" className="font-medium text-gray-700">
                    Confidence Scores
                  </Label>
                </div>
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
                  Generate Export
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
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Format
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Created By
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
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {getFormatDisplayName(exportItem.format)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {exportItem.createdBy}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <Button
                                variant="link"
                                className="text-primary-600 hover:text-primary-900"
                                onClick={() => downloadExportMutation.mutate(exportItem.id)}
                                disabled={downloadExportMutation.isPending}
                              >
                                {downloadExportMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Download"
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
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
