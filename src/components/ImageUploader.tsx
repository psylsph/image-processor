'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageUploaderProps } from '@/types';

export default function ImageUploader({ onImageProcessed }: ImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    if (!file.name.toLowerCase().endsWith('.heic')) {
      return file;
    }

    try {
      // Create an img element to handle the conversion
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Create a blob URL from the HEIC file
      const objectUrl = URL.createObjectURL(file);

      // Wait for the image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image onto the canvas
      ctx?.drawImage(img, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.9);
      });

      // Clean up
      URL.revokeObjectURL(objectUrl);

      // Create a new file from the blob
      return new File([blob], file.name.replace('.heic', '.jpg'), {
        type: 'image/jpeg',
      });
    } catch (error) {
      console.error('Error converting HEIC:', error);
      throw new Error('Failed to convert HEIC image. Please try converting it to JPEG first.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      let file = acceptedFiles[0];
      console.log('Original file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      // Convert HEIC to JPEG if necessary
      if (file.name.toLowerCase().endsWith('.heic')) {
        try {
          file = await convertHeicToJpeg(file);
          console.log('Converted file:', {
            name: file.name,
            type: file.type,
            size: file.size
          });
        } catch (error) {
          throw new Error('Failed to convert HEIC image. Please try converting it to JPEG first.');
        }
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Process the image
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Failed to process image');
      }

      const result = await response.json();
      onImageProcessed(result);
    } catch (error) {
      console.error('Error details:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [onImageProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: undefined,  // Accept all files
    maxFiles: 1,
    multiple: false,
    noClick: false,
    noKeyboard: false
  });

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} accept=".jpg,.jpeg,.png,.heic,.heif,image/*" />
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p>Processing image...</p>
          </div>
        ) : isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <div>
            <p className="mb-2">Drag and drop an image here, or click to select</p>
            <p className="text-sm text-gray-500">Supports PNG, JPEG, HEIC, and HEIF</p>
          </div>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
