import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ProcessedImage } from '@/types';
import { removeBackgroundFromImageBase64, RemoveBgResult } from "remove.bg";

export const runtime = 'nodejs';
export const maxDuration = 60;  // Maximum allowed duration for hobby plan

export async function POST(request: NextRequest) {
  const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;
  const MAX_DIMENSION = 800;
  const blurAmount = 30;

  if (!REMOVE_BG_API_KEY) {
    return NextResponse.json(
      { error: 'Missing API key' },
      { status: 500 }
    );
  }

  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Get file info
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const supportedExtensions = ['jpg', 'jpeg', 'png'];
    
    console.log('Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      extension: fileExtension
    });

    if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Please upload a supported image file (JPG, PNG)' },
        { status: 400 }
      );
    }

    try {
      // Convert file to buffer
      const fileBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(fileBuffer);

      // Resize the image
      const processedImage = await sharp(inputBuffer)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();

      // Remove background
      let removeBgResult: RemoveBgResult | null = null;
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries && !removeBgResult) {
        try {
          removeBgResult = await removeBackgroundFromImageBase64({
            base64img: processedImage.toString('base64'),
            apiKey: REMOVE_BG_API_KEY,
            size: 'regular'
          });
          console.log('Background removal successful');
        } catch (error: any) {
          attempt++;
          console.error(`Attempt ${attempt} failed:`, error);
          
          if (error.response?.status === 429 && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }

      if (!removeBgResult || !removeBgResult.base64img) {
        throw new Error('Failed to remove background after multiple attempts');
      }

      // Process the background-removed image and maintain aspect ratio
      const processedMetadata = await sharp(processedImage).metadata();
      const noBackgroundBuffer = await sharp(Buffer.from(removeBgResult.base64img, 'base64'))
        .resize(processedMetadata.width, processedMetadata.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      // Create blurred background with same dimensions
      const blurredBuffer = await sharp(processedImage)
        .resize(processedMetadata.width, processedMetadata.height, {
          fit: 'fill'
        })
        .blur(blurAmount)
        .modulate({ brightness: 0.7, saturation: 1.3 })
        .toBuffer();

      // Combine images (now they have the same dimensions)
      const combined = await sharp(blurredBuffer)
        .composite([{
          input: noBackgroundBuffer,
          blend: 'over'
        }])
        .toBuffer();

      // Prepare response
      const result: ProcessedImage = {
        original: `data:image/jpeg;base64,${processedImage.toString('base64')}`,
        noBackground: `data:image/png;base64,${noBackgroundBuffer.toString('base64')}`,
        blurredBackground: `data:image/jpeg;base64,${blurredBuffer.toString('base64')}`,
        combined: `data:image/jpeg;base64,${combined.toString('base64')}`
      };

      console.log('Processing completed successfully');
      return NextResponse.json(result);

    } catch (error: any) {
      console.error('Error processing image:', error);
      return NextResponse.json(
        { 
          error: 'Failed to process image: ' + (error.message || 'Unknown error'),
          details: error.toString()
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
