'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageUploaderProps } from '@/types';

export default function ImageUploader({ onImageProcessed }: ImageUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    const file = acceptedFiles[0];

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Process the image
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process image');

      const result = await response.json();
      onImageProcessed(result);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onImageProcessed]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input {...getInputProps()} />
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
          <p className="text-sm text-gray-500">Supports PNG and JPEG</p>
        </div>
      )}
    </div>
  );
}