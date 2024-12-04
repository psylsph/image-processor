'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { ImageUploaderProps, ProcessedImage } from '@/types';

// Import ImageUploader component with no SSR
const ImageUploader = dynamic(() => import('@/components/ImageUploader'), {
  ssr: false,
});

export default function Home() {
  const [processedImages, setProcessedImages] = useState<ProcessedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageProcessed = useCallback((processedImages: ProcessedImage) => {
    setProcessedImages(processedImages);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            Image Background Processor
          </h1>
          <p className="text-gray-400 text-lg mb-12">
            Transform your images with AI-powered background removal and effects
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800 rounded-2xl p-8 shadow-xl mb-8"
          >
            <div className="space-y-6">
              {/* Image Uploader Component */}
              <ImageUploader 
                onImageProcessed={handleImageProcessed}
              />

              {/* Error Message */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-sm mt-2"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Display processed images */}
          {processedImages && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Original Image</h3>
                <img
                  src={processedImages.original}
                  alt="Original"
                  className="rounded-lg w-full"
                />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Processed Image</h3>
                <img
                  src={processedImages.combined}
                  alt="Processed"
                  className="rounded-lg w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
