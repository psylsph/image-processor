import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { ProcessedImage } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize image
    const resizedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();

    // For now, we'll create a simple mask based on brightness
    const mask = await sharp(resizedBuffer)
      .greyscale()
      .blur(20)
      .toBuffer();

    // Create a white background
    const whiteBackground = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .png()
    .toBuffer();

    // Combine the images
    const combined = await sharp(whiteBackground)
      .composite([
        {
          input: mask,
          blend: 'multiply'
        },
        {
          input: resizedBuffer,
          blend: 'over'
        }
      ])
      .toBuffer();

    // Convert all buffers to base64
    const result: ProcessedImage = {
      original: `data:image/png;base64,${resizedBuffer.toString('base64')}`,
      noBackground: `data:image/png;base64,${resizedBuffer.toString('base64')}`,
      blurredBackground: `data:image/png;base64,${mask.toString('base64')}`,
      combined: `data:image/png;base64,${combined.toString('base64')}`
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
