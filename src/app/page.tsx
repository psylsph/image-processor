'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [processedImages, setProcessedImages] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [blurAmount, setBlurAmount] = useState(20);

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
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">Image Background Processor</h1>
        
        <div className="flex flex-col items-center gap-4 w-full">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedImage(file);
                setProcessedImages(null);
              }
            }}
            className="mb-4"
          />

          <div className="w-full max-w-xs mb-4">
            <label className="block text-sm font-medium mb-2">
              Blur Amount: {blurAmount}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={blurAmount}
              onChange={(e) => setBlurAmount(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={processImage}
            disabled={!selectedImage || loading}
            className={`px-4 py-2 rounded ${
              !selectedImage || loading
                ? 'bg-gray-400'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white transition-colors`}
          >
            {loading ? 'Processing...' : 'Process Image'}
          </button>
        </div>

        {processedImages && (
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Original</h3>
              <img
                src={processedImages.original}
                alt="Original"
                className="w-full"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">No Background</h3>
              <img
                src={processedImages.noBackground}
                alt="No Background"
                className="w-full"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Blurred Background</h3>
              <img
                src={processedImages.blurredBackground}
                alt="Blurred Background"
                className="w-full"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Combined</h3>
              <img
                src={processedImages.combined}
                alt="Combined"
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
