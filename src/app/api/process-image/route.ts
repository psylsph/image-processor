import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ProcessedImage } from '@/types';
import { RemoveBgResult, removeBackgroundFromImageBase64 } from "remove.bg";

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 800;

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('Starting image processing request');
  console.log('API Key present:', !!REMOVE_BG_API_KEY);
  
  try {
    if (!REMOVE_BG_API_KEY) {
      console.error('Remove.bg API key not configured');
      return NextResponse.json(
        { error: 'Server configuration error: API key not found' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const blurAmount = Number(formData.get('blurAmount')) || 20;

    console.log('Received file:', !!file);
    console.log('Blur amount:', blurAmount);

    if (!file) {
      console.error('No file provided');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: 'Image file too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Validate file type
    const validImageTypes = ['image/heif', 'image/heic', 'image/heic-sequence'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isValidExtension = ['heic', 'heif'].includes(fileExtension || '');
    
    console.log('File validation:', {
      type: file.type,
      extension: fileExtension,
      isValidExtension,
      name: file.name
    });

    if (!file.type.startsWith('image/') && !validImageTypes.includes(file.type) && !isValidExtension) {
      console.error('Invalid file type:', {
        type: file.type,
        extension: fileExtension,
        name: file.name
      });
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    console.log('Processing image:', {
      type: file.type,
      size: file.size,
      name: file.name,
      extension: fileExtension
    });

    // Convert file to buffer and handle HEIF/HEIC
    const rawBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(new Uint8Array(rawBuffer));
    
    // Convert HEIF/HEIC to JPEG if needed
    const processedBuffer = (validImageTypes.includes(file.type) || isValidExtension)
      ? await sharp(inputBuffer as Buffer).toFormat('jpeg').toBuffer()
      : inputBuffer;

    // Process the image with the correct buffer
    const processedImage = await sharp(processedBuffer)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
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
          const errorMessage = error.response?.data?.errors?.[0]?.title ||
                             error.response?.data?.message ||
                             error.message ||
                             'Failed to remove background';
          return NextResponse.json(
            { error: `Background removal failed: ${errorMessage}` },
            { status: error.response?.status || 500 }
          );
        }
      }
    }

    if (!removeBgResult || !removeBgResult.base64img) {
      return NextResponse.json(
        { error: 'Failed to remove background after multiple attempts' },
        { status: 500 }
      );
    }

    // Process the background-removed image
    const noBackgroundBuffer = await sharp(Buffer.from(removeBgResult.base64img, 'base64'))
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'contain',
      })
      .toBuffer();

    // Create blurred background
    const blurredBuffer = await sharp(processedImage)
      .blur(blurAmount)
      .modulate({ brightness: 0.7, saturation: 1.3 })
      .toBuffer();

    // Combine images
    const combined = await sharp(blurredBuffer)
      .composite([{
        input: noBackgroundBuffer,
        blend: 'over'
      }])
      .toBuffer();

    // Prepare response
    const result: ProcessedImage = {
      original: `data:image/png;base64,${processedImage.toString('base64')}`,
      noBackground: `data:image/png;base64,${noBackgroundBuffer.toString('base64')}`,
      blurredBackground: `data:image/png;base64,${blurredBuffer.toString('base64')}`,
      combined: `data:image/png;base64,${combined.toString('base64')}`
    };

    console.log('Processing completed successfully');
    return NextResponse.json(result);

  } catch (error) {
    console.error('Unhandled error in image processing:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the image' },
      { status: 500 }
    );
  }
}
