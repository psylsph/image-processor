import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ProcessedImage } from '@/types';
import { RemoveBgResult, removeBackgroundFromImageBase64 } from "remove.bg";

const REMOVE_BG_API_KEY = process.env.REMOVE_BG_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Validate API key first
    if (!REMOVE_BG_API_KEY) {
      console.error('Remove.bg API key not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Remove.bg API key not found' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const blurAmount = Number(formData.get('blurAmount')) || 20;
    
    if (!file) {
      console.error('No file provided');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: 'Image file too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    console.log('Processing image:', {
      type: file.type,
      size: file.size,
      name: file.name
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate image buffer
    if (!buffer || buffer.length === 0) {
      console.error('Invalid image buffer');
      return NextResponse.json(
        { error: 'Invalid image data' },
        { status: 400 }
      );
    }

    console.log('Image buffer size:', buffer.length);

    // Step 1: Create base image and get dimensions
    let baseImage;
    try {
      baseImage = sharp(buffer);
      const metadata = await baseImage.metadata();
      
      if (!metadata.width || !metadata.height) {
        console.error('Invalid image dimensions:', metadata);
        return NextResponse.json(
          { error: 'Invalid image dimensions' },
          { status: 400 }
        );
      }

      console.log('Original dimensions:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      });

      // Calculate dimensions while maintaining aspect ratio
      const maxDimension = 800;
      const resizeDimensions = calculateResizeDimensions(
        metadata.width,
        metadata.height,
        maxDimension
      );

      console.log('Resize dimensions:', resizeDimensions);

      // Create resized base image
      const resizedImage = await baseImage
        .resize(resizeDimensions.width, resizeDimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();

      // Step 2: Remove background using remove.bg API
      console.log('Calling remove.bg API...');
      const base64Image = resizedImage.toString('base64');
      let result: RemoveBgResult;
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      while (attempt < maxRetries && !success) {
        try {
          result = await removeBackgroundFromImageBase64({
            base64img: base64Image,
            apiKey: REMOVE_BG_API_KEY,
            size: 'regular',
            type: 'auto'
          });
          success = true;
          if (!result || !result.base64img) {
            console.error('Invalid response from remove.bg:', result);
            throw new Error('Invalid response from background removal service');
          }
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

      // Resize the background-removed image
      console.log('Processing background-removed image...');
      const noBackgroundBuffer = await sharp(Buffer.from(result.base64img, 'base64'))
        .resize(resizeDimensions.width, resizeDimensions.height, {
          fit: 'contain',
          position: 'center'
        })
        .toBuffer();

      // Step 3: Create blurred background
      console.log('Creating blurred background...');
      const blurredBuffer = await sharp(resizedImage)
        .blur(blurAmount)
        .modulate({
          brightness: 0.7,
          saturation: 1.3
        })
        .toBuffer();

      // Step 4: Combine final image
      console.log('Creating final composite...');
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

    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      return NextResponse.json(
        { error: 'Error processing image with Sharp' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in image processing:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the image. Please try again.' },
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
