'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageUploaderProps } from '@/types';
import dynamic from 'next/dynamic';

interface Props extends ImageUploaderProps {
  blurAmount: number;
}

export default function ImageUploader({ onImageProcessed, blurAmount }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertHeicToJpeg = async (file: File): Promise<File> => {
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.heic') && !fileName.endsWith('.heif')) {
      return file;
    }

    try {
      console.log('Converting HEIC/HEIF to JPEG...');
      
      // Dynamically import heic2any only when needed
      const heic2any = (await import('heic2any')).default;
      
      const blob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });

      // Handle both single blob and array of blobs
      const resultBlob = Array.isArray(blob) ? blob[0] : blob;
      
      // Create a new file from the blob
      const newFileName = fileName.replace(/\.(heic|heif)$/, '.jpg');
      const convertedFile = new File([resultBlob], newFileName, {
        type: 'image/jpeg',
      });

      console.log('Conversion successful:', {
        originalName: file.name,
        newName: convertedFile.name,
        newType: convertedFile.type,
        newSize: convertedFile.size
      });

      return convertedFile;
    } catch (error) {
      console.error('Error converting HEIC/HEIF:', error);
      throw new Error('Failed to convert HEIC/HEIF image. Please try converting it to JPEG first.');
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

      // Convert HEIC/HEIF to JPEG if necessary
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
        try {
          file = await convertHeicToJpeg(file);
          console.log('Converted file:', {
            name: file.name,
            type: file.type,
            size: file.size
          });
        } catch (error) {
          console.error('Conversion error:', error);
          throw new Error('Failed to convert HEIC/HEIF image. Please try converting it to JPEG first.');
        }
      }

      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      formData.append('blurAmount', blurAmount.toString());

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
  }, [onImageProcessed, blurAmount]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.heif'],
    },
    maxFiles: 1,
    multiple: false,
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
