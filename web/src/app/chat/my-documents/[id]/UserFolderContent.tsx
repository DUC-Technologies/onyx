import i18n from "@/i18n/init";
import k from "./../../../../i18n/keys";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash,
  Upload,
  AlertCircle,
  X,
} from "lucide-react";
import { useDocumentsContext } from "../DocumentsContext";
import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@/components/ui/button";
import { DocumentList } from "./components/DocumentList";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePopupFromQuery } from "@/components/popup/PopupFromQuery";
import { Input } from "@/components/ui/input";
import { DeleteEntityModal } from "@/components/DeleteEntityModal";
import { MoveFolderModal } from "@/components/MoveFolderModal";
import { FolderResponse } from "../DocumentsContext";
import { getDisplayNameForModel } from "@/lib/hooks";
import { TokenDisplay } from "@/components/TokenDisplay";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CreateEntityModal from "@/components/modals/CreateEntityModal";
import { CleanupModal, CleanupPeriod } from "@/components/CleanupModal";
import { bulkCleanupFiles } from "../api";

// Define allowed file extensions
const ALLOWED_FILE_TYPES = [
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".rtf",
  ".odt",
  // Spreadsheets
  ".csv",
  ".xls",
  ".xlsx",
  ".ods",
  // Presentations
  ".ppt",
  ".pptx",
  ".odp",
  // Images
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".svg",
  ".webp",
  // Web
  ".html",
  ".htm",
  ".xml",
  ".json",
  ".md",
  ".markdown",
  // Archives (if supported by your system)
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  // Code
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".cs",
  ".php",
  ".rb",
  ".go",
  ".swift",
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".less",
];

// Function to check if a file type is allowed
const isFileTypeAllowed = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf("."));
  return ALLOWED_FILE_TYPES.includes(fileExtension);
};

// Filter files to only include allowed types
const filterAllowedFiles = (
  files: File[]
): { allowed: File[]; rejected: string[] } => {
  const allowed: File[] = [];
  const rejected: string[] = [];

  files.forEach((file) => {
    if (isFileTypeAllowed(file)) {
      allowed.push(file);
    } else {
      rejected.push(file.name);
    }
  });

  return { allowed, rejected };
};

// Define enums outside the component and export them
export enum SortType {
  TimeCreated = "Time Created",
  Alphabetical = "Alphabetical",
  Tokens = "Tokens",
}

export enum SortDirection {
  Ascending = "asc",
  Descending = "desc",
}

// Define a type for tracking file upload progress
interface UploadProgress {
  fileName: string;
  progress: number;
}

export default function UserFolderContent({ folderId }: { folderId: number }) {
  const router = useRouter();
  const { llmProviders } = useChatContext();
  const { popup, setPopup } = usePopup();
  const {
    folderDetails,
    getFolderDetails,
    downloadItem,
    renameItem,
    deleteItem,
    createFileFromLink,
    handleUpload,
    refreshFolderDetails,
    getFolders,
    moveItem,
    updateFolderDetails,
  } = useDocumentsContext();

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [deleteItemType, setDeleteItemType] = useState<"file" | "folder">(
    "file"
  );
  const [deleteItemName, setDeleteItemName] = useState("");
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>(SortType.TimeCreated);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    SortDirection.Descending
  );
  const [hoveredColumn, setHoveredColumn] = useState<SortType | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const modelDescriptors = llmProviders.flatMap((provider) =>
    Object.entries(provider.model_token_limits ?? {}).map(
      ([modelName, maxTokens]) => ({
        modelName,
        provider: provider.provider,
        maxTokens,
      })
    )
  );

  const { popup: folderCreatedPopup } = usePopupFromQuery({
    "folder-created": {
      message: `Папка успешно создана`,
      type: "success",
    },
  });
  const [selectedModel, setSelectedModel] = useState(modelDescriptors[0]);

  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const [showInvalidFileMessage, setShowInvalidFileMessage] = useState(false);

  useEffect(() => {
    if (!folderDetails) {
      getFolderDetails(folderId);
    }
  }, [folderId, folderDetails, getFolderDetails]);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const fetchedFolders = await getFolders();
        setFolders(fetchedFolders);
      } catch (error) {
        console.error("Error fetching folders:", error);
      }
    };

    fetchFolders();
  }, []);

  // Hide invalid file message after 5 seconds
  useEffect(() => {
    if (showInvalidFileMessage) {
      // Remove the auto-hide timer
      return () => {};
    }
  }, [showInvalidFileMessage]);

  const handleBack = () => {
    router.push("/chat/my-documents");
  };
  if (!folderDetails) {
    return (
      <div className="min-h-full w-full min-w-0 flex-1 mx-auto max-w-5xl px-4 pb-20 md:pl-8 mt-6 md:pr-8 2xl:pr-14">
        <div className="text-left space-y-4">
          <h2 className="flex items-center gap-1.5 text-lg font-medium leading-tight tracking-tight max-md:hidden">
            {i18n.t(k.NO_FOLDER_FOUND)}
          </h2>
          <p className="text-neutral-600">
            {i18n.t(k.THE_REQUESTED_FOLDER_DOES_NOT)}
          </p>
          <Button onClick={handleBack} variant="outline" className="mt-2">
            {i18n.t(k.BACK_TO_MY_DOCUMENTS)}
          </Button>
        </div>
      </div>
    );
  }

  const totalTokens = folderDetails.files.reduce(
    (acc, file) => acc + (file.token_count || 0),
    0
  );
  const maxTokens = selectedModel.maxTokens;
  const tokenPercentage = (totalTokens / maxTokens) * 100;

  const handleStartChat = () => {
    router.push(`/chat?userFolderId=${folderId}`);
  };

  const handleCreateFileFromLink = async (url: string) => {
    await createFileFromLink(url, folderId);
  };

  const handleRenameItem = async (
    itemId: number,
    currentName: string,
    isFolder: boolean
  ) => {
    setEditingItemId(itemId);
    setNewItemName(currentName);
  };

  const handleSaveRename = async (itemId: number, isFolder: boolean) => {
    if (newItemName && newItemName !== folderDetails.name) {
      try {
        await renameItem(itemId, newItemName, isFolder);
        setPopup({
          message: `${isFolder ? "Папка" : "Файл"} успешно переименован`,
          type: "success",
        });
        await refreshFolderDetails();
      } catch (error) {
        console.error("Error renaming item:", error);
        setPopup({
          message: `Не удалось переименовать ${isFolder ? "папку" : "файл"}`,
          type: "error",
        });
      }
    }
    setEditingItemId(null);
  };

  const handleCancelRename = () => {
    setEditingItemId(null);
    setNewItemName("");
  };

  const handleSaveDescription = async () => {
    if (folderDetails && newDescription !== folderDetails.description) {
      try {
        alert(
          JSON.stringify({
            id: folderDetails.id,
            name: folderDetails.name,
            newDescription,
          })
        );
        await updateFolderDetails(
          folderDetails.id,
          folderDetails.name,
          newDescription
        );
        setPopup({
          message: "Описание папки успешно обновлено",
          type: "success",
        });
        await refreshFolderDetails();
      } catch (error) {
        console.error("Ошибка обновления описания папки:", error);
        setPopup({
          message: "Не удалось обновить описание папки",
          type: "error",
        });
      }
    }
    setEditingDescription(false);
  };

  const handleCancelDescription = () => {
    setEditingDescription(false);
    setNewDescription("");
  };

  const handleDeleteItem = (
    itemId: number,
    isFolder: boolean,
    itemName: string
  ) => {
    setDeleteItemId(itemId);
    setDeleteItemType(isFolder ? "folder" : "file");
    setDeleteItemName(itemName);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteItemId !== null) {
      try {
        await deleteItem(deleteItemId, deleteItemType === "folder");
        setPopup({
          message: `${deleteItemType} успешно удалено`,
          type: "success",
        });
        await refreshFolderDetails();
      } catch (error) {
        console.error("Ошибка удаления элемента:", error);
        setPopup({
          message: `Не удалось удалить ${deleteItemType}`,
          type: "error",
        });
      }
    }
    setIsDeleteModalOpen(false);
  };

  const handleMoveFolder = () => {
    setIsMoveModalOpen(true);
  };

  const confirmMove = async (targetFolderId: number) => {
    try {
      await moveItem(folderId, targetFolderId, true);
      setPopup({
        message: "Папка успешно перемещена",
        type: "success",
      });
      router.push(`/chat/my-documents/${targetFolderId}`);
    } catch (error) {
      console.error("Ошибка перемещения папки:", error);
      setPopup({
        message: "Не удалось переместить папку",
        type: "error",
      });
    }
    setIsMoveModalOpen(false);
  };

  const handleMoveFile = async (fileId: number, targetFolderId: number) => {
    try {
      await moveItem(fileId, targetFolderId, false);
      setPopup({
        message: "Файл успешно перемещен",
        type: "success",
      });
      await refreshFolderDetails();
    } catch (error) {
      console.error("Ошибка перемещения файла:", error);
      setPopup({
        message: "Не удалось переместить файл",
        type: "error",
      });
    }
  };

  const handleSortChange = (newSortType: SortType) => {
    if (sortType === newSortType) {
      setSortDirection(
        sortDirection === SortDirection.Ascending
          ? SortDirection.Descending
          : SortDirection.Ascending
      );
    } else {
      setSortType(newSortType);
      setSortDirection(SortDirection.Descending);
    }
  };

  const renderSortIndicator = (columnType: SortType) => {
    if (sortType !== columnType) return null;

    return sortDirection === SortDirection.Ascending ? (
      <ArrowUp className="ml-1 h-3 w-3 inline" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 inline" />
    );
  };

  const renderHoverIndicator = (columnType: SortType) => {
    if (sortType === columnType || hoveredColumn !== columnType) return null;

    return <ArrowDown className="ml-1 h-3 w-3 inline opacity-70" />;
  };

  const handleCreateFolder = async (name: string) => {
    try {
      // await createFolder(name, folderId);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  // Add new drag and drop handlers
  const handlePageDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (folderDetails?.id !== -1) {
      setIsDraggingOver(true);
    }
  };

  const handlePageDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Keep the isDraggingOver state true while dragging over
    if (folderDetails?.id !== -1 && !isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handlePageDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDraggingOver to false if we're leaving the container itself
    if (
      pageContainerRef.current &&
      !pageContainerRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDraggingOver(false);
    }
  };

  // Handle file upload progress tracking
  const handleUploadProgress = (fileName: string, progress: number) => {
    setUploadProgress((prev) => {
      const existing = prev.findIndex((p) => p.fileName === fileName);
      if (existing >= 0) {
        // Update existing progress
        const updated = [...prev];
        updated[existing] = { fileName, progress };
        return updated;
      } else {
        // Add new file progress
        return [...prev, { fileName, progress }];
      }
    });
  };

  // Add drag-drop upload progress tracking
  const handlePageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (
      folderDetails?.id !== -1 &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      const files = Array.from(e.dataTransfer.files);

      // Filter out invalid file types
      const { allowed, rejected } = filterAllowedFiles(files);

      // Show error message if there are invalid files
      if (rejected.length > 0) {
        setInvalidFiles(rejected);
        setShowInvalidFileMessage(true);
      }

      // Only proceed if there are valid files
      if (allowed.length > 0) {
        // Track uploading files
        const fileNames = allowed.map((file) => file.name);
        setUploadingFiles((prev) => [...prev, ...fileNames]);

        // Initialize progress for each file
        fileNames.forEach((fileName) => {
          handleUploadProgress(fileName, 0);
        });

        try {
          await handleUpload(allowed);
        } catch (error) {
          console.error("Ошибка загрузки файлов:", error);
          setPopup({
            message: "Не удалось загрузить файлы",
            type: "error",
          });
        }
      }
    }
  };

  // Function to update uploading files that can be called from DocumentList
  const updateUploadingFiles = (newUploadingFiles: string[]) => {
    setUploadingFiles(newUploadingFiles);
  };

  const handleCleanup = () => {
    setIsCleanupModalOpen(true);
  };

  const confirmCleanup = async (period: CleanupPeriod, value: number) => {
    try {
      let daysOlderThan: number | null = null;

      // Convert the selected period and value to days
      if (period === CleanupPeriod.Day) {
        daysOlderThan = 1;
      } else if (period === CleanupPeriod.Week) {
        daysOlderThan = 7;
      } else if (period === CleanupPeriod.Month) {
        daysOlderThan = 30;
      } else if (period === CleanupPeriod.All) {
        // All documents, don't set a date filter
        daysOlderThan = null;
      }

      const result = await bulkCleanupFiles({
        folder_id: folderId,
        days_older_than: daysOlderThan,
      });

      setPopup({
        message: result.message,
        type: "success",
      });

      // Refresh folder details to update the UI
      await refreshFolderDetails();

      // Close the modal after successful completion
      setIsCleanupModalOpen(false);
    } catch (error) {
      console.error("Error during cleanup:", error);
      setPopup({
        message: "Не удалось очистить файлы",
        type: "error",
      });
      // Modal will remain open, user can try again or cancel
    }
  };

  return (
    <div
      className={`h-screen pt-20 w-full min-w-0 flex-1 mx-auto w-full max-w-[90rem] flex-1 px-4 pb-20 md:pl-8 md:pr-8 2xl:pr-14 relative ${
        isDraggingOver ? "drag-overlay" : ""
      }`}
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
      ref={pageContainerRef}
    >
      {popup}
      {folderCreatedPopup}

      {/* Invalid file message */}

      {/* Add a visual overlay when dragging files */}
      {isDraggingOver && (
        <div className="fixed inset-0 bg-neutral-950/10 backdrop-blur-sm z-50 pointer-events-none flex items-center justify-center transition-all duration-200 ease-in-out">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 shadow-lg text-center border border-neutral-200 dark:border-neutral-800 max-w-md mx-auto">
            <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-full w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              <Upload
                className="w-10 h-10 text-neutral-600 dark:text-neutral-300"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-xl font-medium mb-2 text-neutral-900 dark:text-neutral-50">
              {i18n.t(k.DROP_FILES_TO_UPLOAD)}
            </h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">
              {i18n.t(k.FILES_WILL_BE_UPLOADED_TO)}{" "}
              <span className="font-medium text-neutral-900 dark:text-neutral-200">
                {folderDetails?.name || "this folder"}
              </span>
            </p>
          </div>
        </div>
      )}

      <DeleteEntityModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        entityType={deleteItemType}
        entityName={deleteItemName}
      />

      <MoveFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={confirmMove}
        folders={folders}
        currentFolderId={folderId}
      />

      <CleanupModal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        onConfirm={confirmCleanup}
      />

      <div className="flex  -mt-[1px] flex-col w-full">
        <div className="flex items-center mb-3">
          <nav className="flex text-lg gap-x-1 items-center">
            <span
              className="font-medium leading-tight tracking-tight text-lg text-neutral-800 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer flex items-center text-base"
              onClick={handleBack}
            >
              {i18n.t(k.MY_DOCUMENTS)}
            </span>
            <span className="text-neutral-800 dark:text-neutral-700 flex items-center">
              <ChevronRight className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
            </span>
            {editingItemId === folderDetails.id ? (
              <div className="flex -my-1 items-center">
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="mr-2 h-8 dark:bg-neutral-800 dark:border-neutral-700"
                />

                <Button
                  onClick={() => handleSaveRename(folderDetails.id, true)}
                  className="mr-2 h-8 py-0 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                  size="sm"
                >
                  {i18n.t(k.SAVE)}
                </Button>
                <Button
                  onClick={handleCancelRename}
                  variant="outline"
                  className="h-8 py-0 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  size="sm"
                >
                  {i18n.t(k.CANCEL)}
                </Button>
              </div>
            ) : (
              <h1
                className="text-neutral-900 dark:text-neutral-100 font-medium cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200"
                onClick={() =>
                  handleRenameItem(folderDetails.id, folderDetails.name, true)
                }
              >
                {folderDetails.name}
              </h1>
            )}
          </nav>
          <Button
            className={`ml-auto inline-flex items-center justify-center relative shrink-0 h-9 px-4 py-2 rounded-lg active:scale-[0.985] whitespace-nowrap pl-3 pr-4 gap-1.5 ${
              folderId != -1 && "invisible pointer-events-none"
            } ${
              folderId == -1
                ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 dark:border-neutral-700"
                : ""
            }`}
            onClick={handleCleanup}
          >
            <Trash className="h-4 w-4" />
            {i18n.t(k.CLEANUP)}
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative w-full max-w-xl">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-neutral-400"
              >
                <path
                  d="M10 6.5C10 8.433 8.433 10 6.5 10C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5ZM9.30884 10.0159C8.53901 10.6318 7.56251 11 6.5 11C4.01472 11 2 8.98528 2 6.5C2 4.01472 4.01472 2 6.5 2C8.98528 2 11 4.01472 11 6.5C11 7.56251 10.6318 8.53901 10.0159 9.30884L12.8536 12.1464C13.0488 12.3417 13.0488 12.6583 12.8536 12.8536C12.6583 13.0488 12.3417 13.0488 12.1464 12.8536L9.30884 10.0159Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Поиск документов..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleStartChat}
              className="flex items-center gap-2 p-4 bg-black rounded-full !text-xs text-white hover:bg-neutral-800"
            >
              <MessageSquare className="w-3 h-3" />
              {i18n.t(k.CHAT_WITH_THIS_FOLDER)}
            </Button>
            <TokenDisplay
              totalTokens={totalTokens}
              maxTokens={maxTokens}
              tokenPercentage={tokenPercentage}
              selectedModel={selectedModel}
            />
          </div>
        </div>

        <DocumentList
          folderId={folderId}
          isLoading={false}
          files={folderDetails.files}
          onRename={handleRenameItem}
          onDelete={handleDeleteItem}
          onDownload={async (documentId: string) => {
            const blob = await downloadItem(documentId);
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          }}
          onUpload={handleUpload}
          onMove={handleMoveFile}
          folders={folders}
          disabled={folderDetails.id === -1}
          editingItemId={editingItemId}
          onSaveRename={handleSaveRename}
          onCancelRename={handleCancelRename}
          newItemName={newItemName}
          setNewItemName={setNewItemName}
          tokenPercentage={tokenPercentage}
          totalTokens={totalTokens}
          maxTokens={maxTokens}
          selectedModelName={getDisplayNameForModel(selectedModel.modelName)}
          searchQuery={searchQuery}
          sortType={sortType}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          hoveredColumn={hoveredColumn}
          setHoveredColumn={setHoveredColumn}
          renderSortIndicator={renderSortIndicator}
          renderHoverIndicator={renderHoverIndicator}
          externalUploadingFiles={uploadingFiles}
          updateUploadingFiles={updateUploadingFiles}
          onUploadProgress={handleUploadProgress}
          invalidFiles={invalidFiles}
          showInvalidFileMessage={showInvalidFileMessage}
          setShowInvalidFileMessage={setShowInvalidFileMessage}
        />
      </div>
    </div>
  );
}
