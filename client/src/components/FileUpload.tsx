import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { ReconciliationData } from '../types';

interface FileUploadProps {
  onReconciliationComplete: (data: ReconciliationData) => void;
  onError: (error: string | null) => void;
  onLoading: (loading: boolean) => void;
  isLoading: boolean;
  error: string | null;
}

interface UploadedFile {
  file: File;
  type: 'sales' | 'purchase';
}

const FileUpload: React.FC<FileUploadProps> = ({
  onReconciliationComplete,
  onError,
  onLoading,
  isLoading,
  error
}) => {
  const [salesOrderFile, setSalesOrderFile] = useState<UploadedFile | null>(null);
  const [purchaseOrderFiles, setPurchaseOrderFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], type: 'sales' | 'purchase') => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
      onError('Please upload only Excel files (.xlsx or .xls)');
      return;
    }

    const uploadedFile: UploadedFile = { file, type };
    
    if (type === 'sales') {
      setSalesOrderFile(uploadedFile);
    } else {
      setPurchaseOrderFiles(prev => [...prev, uploadedFile]);
    }
  }, [onError]);

  const salesDropzone = useDropzone({
    onDrop: (files) => onDrop(files, 'sales'),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const purchaseDropzone = useDropzone({
    onDrop: (files) => onDrop(files, 'purchase'),
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  const handleReconcile = async () => {
    if (!salesOrderFile || purchaseOrderFiles.length === 0) {
      onError('Please upload both Sales Order and at least one Purchase Order file');
      return;
    }

    onLoading(true);
    onError(null);

    try {
      const formData = new FormData();
      formData.append('salesOrder', salesOrderFile.file);
      purchaseOrderFiles.forEach(file => {
        formData.append('purchaseOrders', file.file);
      });

      const response = await axios.post<ReconciliationData>('http://localhost:5001/api/reconcile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onReconciliationComplete(response.data);
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      onError(error.response?.data?.error || 'Reconciliation failed. Please try again.');
    } finally {
      onLoading(false);
    }
  };

  const removeFile = (file: File, type: 'sales' | 'purchase') => {
    if (type === 'sales') {
      setSalesOrderFile(null);
    } else {
      setPurchaseOrderFiles(prev => prev.filter(f => f.file !== file));
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-section">
        <h2>📋 Sales Order File</h2>
        <p className="file-format-info">
          <strong>Format:</strong> Data starts from Row 17, Item codes in Column A, Quantities in Column M, Price in Column O
        </p>
        <div
          {...salesDropzone.getRootProps()}
          className={`dropzone ${salesDropzone.isDragActive ? 'active' : ''} ${salesOrderFile ? 'has-file' : ''}`}
        >
          <input {...salesDropzone.getInputProps()} />
          {salesOrderFile ? (
            <div className="file-info">
              <CheckCircle className="file-icon success" />
              <div>
                <p className="file-name">{salesOrderFile.file.name}</p>
                <p className="file-size">{(salesOrderFile.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(salesOrderFile.file, 'sales');
                }}
                className="remove-file"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="dropzone-content">
              <Upload className="upload-icon" />
              <p>Drop your Sales Order Excel file here</p>
              <p className="dropzone-subtitle">or click to browse</p>
            </div>
          )}
        </div>
      </div>

      <div className="upload-section">
        <h2>📦 Purchase Order Files</h2>
        <p className="file-format-info">
          <strong>Format:</strong> Data starts from Row 16, Item codes in Column B, Quantities in Column H, Price in Column I
        </p>
        <div
          {...purchaseDropzone.getRootProps()}
          className={`dropzone ${purchaseDropzone.isDragActive ? 'active' : ''} ${purchaseOrderFiles.length > 0 ? 'has-file' : ''}`}
        >
          <input {...purchaseDropzone.getInputProps()} />
          {purchaseOrderFiles.length > 0 ? (
            <div className="files-list">
              {purchaseOrderFiles.map((file, index) => (
                <div key={index} className="file-info">
                  <FileText className="file-icon" />
                  <div>
                    <p className="file-name">{file.file.name}</p>
                    <p className="file-size">{(file.file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.file, 'purchase');
                    }}
                    className="remove-file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="dropzone-content">
              <Upload className="upload-icon" />
              <p>Drop your Purchase Order Excel files here</p>
              <p className="dropzone-subtitle">or click to browse (multiple files allowed)</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle className="error-icon" />
          <p>{error}</p>
        </div>
      )}

      <div className="action-buttons">
        <button
          onClick={handleReconcile}
          disabled={!salesOrderFile || purchaseOrderFiles.length === 0 || isLoading}
          className="reconcile-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="spinner" />
              Processing...
            </>
          ) : (
            '🔍 Start Reconciliation'
          )}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;