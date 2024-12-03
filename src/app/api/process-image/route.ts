import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ProcessedImage } from '@/types';
import { RemoveBgResult, removeBackgroundFromImageBase64 } from "remove.bg";

// You'll need to get an API key from remove.bg
const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY || 'your-api-key-here';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting image processing...');
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const blurAmount = Number(formData.get('blurAmount')) || 20;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (!REMOVE_BG_API_KEY || REMOVE_BG_API_KEY === 'your-api-key-here') {
      return NextResponse.json(
        { error: 'Remove.bg API key not configured' },
        { status: 500 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Step 1: Create base image and get dimensions
    const baseImage = sharp(buffer);
    const metadata = await baseImage.metadata();
    
    // Calculate dimensions while maintaining aspect ratio
    const maxDimension = 800;
    const resizeDimensions = calculateResizeDimensions(
      metadata.width || 800,
      metadata.height || 800,
      maxDimension
    );

    // Create resized base image
    const resizedImage = await baseImage
      .resize(resizeDimensions.width, resizeDimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();

    // Get exact dimensions of resized image
    const resizedMetadata = await sharp(resizedImage).metadata();
    const width = resizedMetadata.width!;
    const height = resizedMetadata.height!;

    // Step 2: Remove background using remove.bg API
    const base64Image = resizedImage.toString('base64');
    const result: RemoveBgResult = await removeBackgroundFromImageBase64({
      base64img: base64Image,
      apiKey: REMOVE_BG_API_KEY,
      size: 'regular',
      type: 'auto'
    });

    // Resize the background-removed image to match original dimensions
    const noBackgroundBuffer = await sharp(Buffer.from(result.base64img, 'base64'))
      .resize(resizeDimensions.width, resizeDimensions.height, {
        fit: 'contain',
        position: 'center'
      })
      .toBuffer();

    // Step 3: Create blurred background
    const blurredBuffer = await sharp(resizedImage)
      .blur(blurAmount)
      .modulate({
        brightness: 0.7,
        saturation: 1.3
      })
      .gamma(1.2)
      .toBuffer();

    // Step 4: Combine final image
    const combined = await sharp(blurredBuffer)
      .composite([
        {
          input: noBackgroundBuffer,
          blend: 'over'
        }
      ])
      .toBuffer();

    const resultImage: ProcessedImage = {
      original: `data:image/png;base64,${resizedImage.toString('base64')}`,
      noBackground: `data:image/png;base64,${noBackgroundBuffer.toString('base64')}`,
      blurredBackground: `data:image/png;base64,${blurredBuffer.toString('base64')}`,
      combined: `data:image/png;base64,${combined.toString('base64')}`
    };

    console.log('Processing completed successfully');
    return NextResponse.json(resultImage);

  } catch (error) {
    console.error('Error in image processing:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    );
  }
}

function calculateResizeDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  if (width > height) {
    const newWidth = maxDimension;
    const newHeight = Math.round((height * maxDimension) / width);
    return { width: newWidth, height: newHeight };
  } else {
    const newHeight = maxDimension;
    const newWidth = Math.round((width * maxDimension) / height);
    return { width: newWidth, height: newHeight };
  }
}
