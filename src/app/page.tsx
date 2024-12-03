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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setProcessedImages(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const processImage = useCallback(async () => {
    if (!selectedImage) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('blurAmount', blurAmount.toString());

    try {
      const response = await fetch('/api/process-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      setProcessedImages(result);
    } catch (error) {
      console.error('Error processing image:', error);
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
                  onChange={handleImageSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`relative cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-all hover:border-teal-400 flex flex-col items-center
                    ${previewUrl ? 'border-teal-500' : 'border-gray-600'}`}
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
                        Drop your image here or click to upload
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
