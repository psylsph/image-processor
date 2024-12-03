'use client';

import { ImageProcessorProps } from '@/types';
import download from 'downloadjs';

export default function ImageProcessor({ processedImage, onReset }: ImageProcessorProps) {
  const handleDownload = () => {
    // Convert base64 to blob and download
    fetch(processedImage.combined)
      .then(res => res.blob())
      .then(blob => {
        download(blob, 'processed-image.png', 'image/png');
      });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Original Image</h3>
          <img 
            src={processedImage.original} 
            alt="Original" 
            className="w-full rounded-lg shadow-md"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Final Result</h3>
          <img 
            src={processedImage.combined} 
            alt="Processed" 
            className="w-full rounded-lg shadow-md"
          />
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Download Result
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Process Another Image
        </button>
      </div>
    </div>
  );
}
