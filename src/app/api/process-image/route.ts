import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ProcessedImage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting image processing...');
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
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

    // Step 2: Create mask with exact same dimensions
    const mask = await sharp(resizedImage)
      .resize(resizeDimensions.width, resizeDimensions.height)
      .greyscale()
      .normalise()
      .threshold(128)
      .raw()
      .toBuffer();

    // Step 3: Apply mask to create transparent background
    const noBackgroundBuffer = await sharp(resizedImage)
      .ensureAlpha()
      .composite([
        {
          input: mask,
          raw: {
            width: resizeDimensions.width,
            height: resizeDimensions.height,
            channels: 1
          },
          blend: 'dest-in'
        }
      ])
      .toBuffer();

    // Step 4: Create blurred background
    const blurredBuffer = await sharp(resizedImage)
      .blur(20)
      .modulate({
        brightness: 0.7,
        saturation: 1.3
      })
      .gamma(1.2)
      .toBuffer();

    // Step 5: Combine final image
    const combined = await sharp(blurredBuffer)
      .composite([
        {
          input: noBackgroundBuffer,
          blend: 'over'
        }
      ])
      .toBuffer();

    const result: ProcessedImage = {
      original: `data:image/png;base64,${resizedImage.toString('base64')}`,
      noBackground: `data:image/png;base64,${noBackgroundBuffer.toString('base64')}`,
      blurredBackground: `data:image/png;base64,${blurredBuffer.toString('base64')}`,
      combined: `data:image/png;base64,${combined.toString('base64')}`
    };

    console.log('Processing completed successfully');
    return NextResponse.json(result);

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
