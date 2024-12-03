'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhotoIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [processedImages, setProcessedImages] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [blurAmount, setBlurAmount] = useState(20);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setProcessedImages(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    handleImageSelect(file);
  };

  const processImage = useCallback(async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('blurAmount', blurAmount.toString());

    try {
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to process image' }));
        throw new Error(errorData.error || 'Failed to process image');
      }
      
      const result = await response.json();
      setProcessedImages(result);
    } catch (error) {
      console.error('Error processing image:', error);
      setError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setLoading(false);
    }
  }, [selectedImage, blurAmount]);

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
              {/* File Upload Area */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`relative cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-all hover:border-teal-400 flex flex-col items-center
                    ${isDragging ? 'border-teal-400 bg-gray-700/50' : ''}
                    ${previewUrl ? 'border-teal-500' : 'border-gray-600'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 rounded-lg"
                    />
                  ) : (
                    <>
                      <PhotoIcon className="h-12 w-12 text-gray-400 mb-4" />
                      <span className="text-sm text-gray-400">
                        {isDragging ? 'Drop image here' : 'Drop your image here or click to upload'}
                      </span>
                    </>
                  )}
                </label>
              </div>

              {/* Blur Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-gray-300">
                    Blur Intensity
                  </label>
                  <span className="text-sm text-teal-400">{blurAmount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={blurAmount}
                  onChange={(e) => setBlurAmount(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgb(45, 212, 191) ${blurAmount}%, rgb(55, 65, 81) ${blurAmount}%)`
                  }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm mb-4">
                  {error}
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={processImage}
                disabled={!selectedImage || loading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-105
                  ${!selectedImage || loading
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Process Image'
                )}
              </button>
            </div>
          </motion.div>

          {/* Results Grid */}
          <AnimatePresence>
            {processedImages && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {[
                  { title: 'Original', image: processedImages.original },
                  { title: 'No Background', image: processedImages.noBackground },
                  { title: 'Blurred Background', image: processedImages.blurredBackground },
                  { title: 'Combined Result', image: processedImages.combined }
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-800 rounded-xl overflow-hidden shadow-lg"
                  >
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-lg font-medium text-gray-200">{item.title}</h3>
                    </div>
                    <div className="p-4">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full rounded-lg"
                      />
                    </div>
                    <div className="p-4 pt-0">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = item.image;
                          link.download = `${item.title.toLowerCase().replace(' ', '-')}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="w-full py-2 px-4 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
