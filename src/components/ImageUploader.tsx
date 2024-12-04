'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageUploaderProps } from '@/types';
import dynamic from 'next/dynamic';

interface Props extends Omit<ImageUploaderProps, 'blurAmount'> {}

export default function ImageUploader({ onImageProcessed }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [blurAmount, setBlurAmount] = useState(20);

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

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      let processableFile = file;
      if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        processableFile = await convertHeicToJpeg(file);
      }

      const formData = new FormData();
      formData.append('image', processableFile);
      // Scale the blur amount - when user selects 100, we send 50
      const scaledBlurAmount = (blurAmount / 100) * 50;
      formData.append('blurAmount', scaledBlurAmount.toString());

      // Process the image
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      onImageProcessed(result);
      setSelectedFile(null);
    } catch (error) {
      console.error('Processing error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setSelectedFile(acceptedFiles[0]);
    setError(null);
  }, []);

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
      {/* File Input */}
      <div {...getRootProps()} className="relative">
        <input {...getInputProps()} />
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
          <div className="space-y-2">
            <div className="flex flex-col items-center justify-center">
              {isDragActive ? (
                <p className="text-teal-400">Drop the file here</p>
              ) : (
                <>
                  <p className="text-gray-400">Drag and drop an image here, or</p>
                  <button
                    type="button"
                    className="mt-2 px-4 py-2 bg-gradient-to-r from-teal-400 to-blue-500 text-white rounded-lg hover:from-teal-500 hover:to-blue-600 transition-all transform hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) onDrop([file]);
                      };
                      input.click();
                    }}
                  >
                    Select File
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    Supports JPG, PNG, HEIC/HEIF
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected File Name */}
      {selectedFile && !isProcessing && (
        <div className="text-sm text-gray-400 text-center">
          Selected: {selectedFile.name}
        </div>
      )}

      {/* Blur Control - Only show when file is selected */}
      {selectedFile && !isProcessing && (
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-gray-300">
              Background Blur
            </label>
            <span className="text-sm text-teal-400">{(blurAmount / 100) * 50}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={blurAmount}
            onChange={(e) => setBlurAmount(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Process Button */}
      {selectedFile && !isProcessing && (
        <button
          onClick={() => processImage(selectedFile)}
          className="w-full py-3 px-4 bg-gradient-to-r from-teal-400 to-blue-500 text-white rounded-lg font-medium hover:from-teal-500 hover:to-blue-600 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Process Image
        </button>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 text-teal-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing image...</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}
