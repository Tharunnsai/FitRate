import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

// Initialize Supabase client
const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

export async function POST(request: Request) {
  try {
    // Verify environment variables are available
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing file or userId' },
        { status: 400 }
      );
    }
    
    const filename = `${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);
    
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

// Increase the body size limit for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 