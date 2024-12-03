'use client';

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ImageProcessor from '@/components/ImageProcessor';
import { ProcessedImage } from '@/types';

export default function Home() {
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">Image Background Processor</h1>
        
        {!processedImage ? (
          <ImageUploader onImageProcessed={setProcessedImage} />
        ) : (
          <ImageProcessor 
            processedImage={processedImage}
            onReset={() => setProcessedImage(null)}
          />
        )}
      </div>
    </main>
  );
}
