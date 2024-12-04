export interface ProcessedImage {
  original: string;
  noBackground: string;
  blurredBackground: string;
  combined: string;
}

export interface ImageUploaderProps {
  onImageProcessed: (image: ProcessedImage) => void;
  blurAmount: number;
}

export interface ImageProcessorProps {
  processedImage: ProcessedImage;
  onReset: () => void;
}
