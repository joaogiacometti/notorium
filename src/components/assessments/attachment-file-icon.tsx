import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EXTENSION_ICON_MAP: Record<string, React.ElementType> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
  avif: FileImage,
  bmp: FileImage,
  tiff: FileImage,
};

const EXTENSION_COLOR_MAP: Record<string, string> = {
  pdf: "text-(--intent-danger-text)",
  doc: "text-(--intent-info-text)",
  docx: "text-(--intent-info-text)",
  xls: "text-(--intent-success-text)",
  xlsx: "text-(--intent-success-text)",
  ppt: "text-(--intent-warning-text)",
  pptx: "text-(--intent-warning-text)",
  png: "text-(--intent-info-text)",
  jpg: "text-(--intent-info-text)",
  jpeg: "text-(--intent-info-text)",
  gif: "text-(--intent-info-text)",
  webp: "text-(--intent-info-text)",
  avif: "text-(--intent-info-text)",
};

interface AttachmentFileIconProps {
  fileName: string;
  className?: string;
}

/**
 * Renders a colored file-type icon based on the file extension.
 *
 * @example
 * <AttachmentFileIcon fileName="report.pdf" className="size-4" />
 */
export function AttachmentFileIcon({
  fileName,
  className,
}: Readonly<AttachmentFileIconProps>) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const Icon = EXTENSION_ICON_MAP[extension] ?? File;
  const colorClass = EXTENSION_COLOR_MAP[extension] ?? "text-muted-foreground";

  return <Icon className={cn(colorClass, className)} />;
}
