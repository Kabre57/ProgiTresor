'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { File as FileIcon, Archive, FileCode, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const BYTE = 1000;
const getKB = (bytes: number) => Math.round(bytes / BYTE);

interface FileIconProps {
  children: React.ReactNode;
}

const FileIconWrapper = ({ children }: FileIconProps) => {
  return <span className="text-3xl text-slate-500 dark:text-slate-400">{children}</span>;
};

interface FileItemProps {
  file: File;
  children?: React.ReactNode;
  className?: string;
}

const FileItem = ({ file, children, className }: FileItemProps) => {
  const { type, name, size } = file;

  const renderThumbnail = () => {
    const isImageFile = type.split('/')[0] === 'image';

    if (isImageFile) {
      return (
        <img
          className="h-10 w-10 object-cover rounded-md border border-[var(--border)]"
          src={URL.createObjectURL(file)}
          alt={`file preview ${name}`}
        />
      );
    }

    if (type === 'application/zip' || type === 'application/x-zip-compressed') {
      return (
        <FileIconWrapper>
          <Archive size={28} />
        </FileIconWrapper>
      );
    }

    if (type === 'application/json' || name.endsWith('.json') || name.endsWith('.csv')) {
      return (
        <FileIconWrapper>
          <FileCode size={28} />
        </FileIconWrapper>
      );
    }

    return (
      <FileIconWrapper>
        <FileIcon size={28} />
      </FileIconWrapper>
    );
  };

  return (
    <div className={cn('flex items-center justify-between p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]', className)}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">{renderThumbnail()}</div>
        <div className="min-w-0 flex-1">
          <h6 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]" title={name}>
            {name}
          </h6>
          <span className="text-xs text-slate-400 dark:text-slate-500">{getKB(size)} KB</span>
        </div>
      </div>
      {children}
    </div>
  );
};

export interface UploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  accept?: string;
  beforeUpload?: (files: FileList | null, fileList: File[]) => boolean | string;
  disabled?: boolean;
  draggable?: boolean;
  fileList?: File[];
  fileListClass?: string;
  fileItemClass?: string;
  multiple?: boolean;
  onChange?: (newFiles: File[], oldFiles: File[]) => void;
  onFileRemove?: (updatedFiles: File[]) => void;
  showList?: boolean;
  tip?: React.ReactNode;
  uploadLimit?: number;
}

export const Upload = React.forwardRef<HTMLDivElement, UploadProps>((props, ref) => {
  const {
    accept,
    beforeUpload,
    disabled = false,
    draggable = false,
    fileList = [],
    fileListClass,
    fileItemClass,
    multiple,
    onChange,
    onFileRemove,
    showList = true,
    tip,
    uploadLimit,
    children,
    className,
    ...rest
  } = props;

  const fileInputField = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>(fileList);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (JSON.stringify(files.map(f => ({ name: f.name, size: f.size }))) !== JSON.stringify(fileList.map(f => ({ name: f.name, size: f.size })))) {
      setFiles(fileList);
    }
  }, [fileList]);

  const triggerMessage = (msg = '') => {
    // If we have a toast notification we can show it here, or use alert
    alert(msg || 'Import échoué !');
  };

  const pushFile = (newFiles: FileList, currentFiles: File[]): File[] => {
    const arr = [...currentFiles];
    for (let i = 0; i < newFiles.length; i++) {
      arr.push(newFiles[i]);
    }
    return arr;
  };

  const addNewFiles = (newFiles: FileList): File[] => {
    let currentFiles = [...files];
    if (typeof uploadLimit === 'number' && uploadLimit !== 0) {
      if (currentFiles.length >= uploadLimit) {
        if (uploadLimit === 1) {
          currentFiles = [];
          currentFiles = pushFile(newFiles, currentFiles);
        }
        return currentFiles;
      }
    }
    currentFiles = pushFile(newFiles, currentFiles);
    return currentFiles;
  };

  const handleNewFileUpload = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    let result: boolean | string = true;

    if (beforeUpload) {
      result = beforeUpload(newFiles, files);

      if (result === false) {
        triggerMessage();
        return;
      }

      if (typeof result === 'string' && result.length > 0) {
        triggerMessage(result);
        return;
      }
    }

    if (result) {
      const updatedFiles = addNewFiles(newFiles);
      setFiles(updatedFiles);
      onChange?.(updatedFiles, files);
    }
  };

  const onNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNewFileUpload(e.target.files);
  };

  const removeFile = (fileIndex: number) => {
    const deletedFileList = files.filter((_, index) => index !== fileIndex);
    setFiles(deletedFileList);
    onFileRemove?.(deletedFileList);
    onChange?.(deletedFileList, files);
  };

  const triggerUpload = (e: React.MouseEvent) => {
    if (!disabled) {
      fileInputField.current?.click();
    }
    e.stopPropagation();
  };

  const handleDragLeave = useCallback(() => {
    if (draggable) {
      setDragOver(false);
    }
  }, [draggable]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggable && !disabled) {
      setDragOver(true);
    }
  }, [draggable, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggable && !disabled) {
      setDragOver(false);
      handleNewFileUpload(e.dataTransfer.files);
    }
  }, [draggable, disabled, files]);

  const renderChildren = () => {
    if (!draggable && !children) {
      return (
        <button
          type="button"
          disabled={disabled}
          className="px-4 py-2 border border-[var(--border)] rounded-md bg-[var(--surface)] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          onClick={(e) => e.preventDefault()}
        >
          Sélectionner un fichier
        </button>
      );
    }

    if (draggable && !children) {
      return (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--border)] rounded-lg hover:border-[var(--primary)] transition duration-150 cursor-pointer">
          <FileIcon className="h-10 w-10 text-slate-400 mb-2" />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            Faites glisser un fichier ici ou <span className="text-[var(--primary)] font-medium">parcourez</span>
          </span>
        </div>
      );
    }

    return children;
  };

  const uploadClass = cn(
    'upload relative',
    draggable && 'upload-draggable w-full',
    disabled && 'opacity-50 cursor-not-allowed',
    dragOver && 'border-[var(--primary)] bg-slate-50 dark:bg-slate-800/50',
    className
  );

  return (
    <div className="space-y-4">
      <div
        ref={ref}
        className={uploadClass}
        onClick={draggable ? undefined : triggerUpload}
        onDragLeave={draggable ? handleDragLeave : undefined}
        onDragOver={draggable ? handleDragOver : undefined}
        onDrop={draggable ? handleDrop : undefined}
        {...rest}
      >
        <input
          ref={fileInputField}
          className="hidden"
          type="file"
          disabled={disabled}
          multiple={multiple}
          accept={accept}
          value=""
          onChange={onNewFileChange}
        />
        {renderChildren()}
      </div>
      {tip && <div className="text-xs text-slate-500 dark:text-slate-400">{tip}</div>}
      {showList && files.length > 0 && (
        <div className={cn('grid grid-cols-1 gap-2 mt-2', fileListClass)}>
          {files.map((file, index) => (
            <FileItem key={file.name + '-' + index} file={file} className={fileItemClass}>
              <button
                type="button"
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <X size={16} />
              </button>
            </FileItem>
          ))}
        </div>
      )}
    </div>
  );
});

Upload.displayName = 'Upload';
