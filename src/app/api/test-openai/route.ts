import { NextResponse } from 'next/server';

/**
 * GET /api/test-openai
 * 
 * Test endpoint to verify OpenAI API key configuration
 * DELETE THIS FILE after testing!
 */
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  
  const processCwd = process.cwd();
  const envLocalPath = path.join(processCwd, '.env.local');
  const envLocalExists = fs.existsSync(envLocalPath);
  
  // Read key directly from .env.local file (to avoid system env variable conflicts)
  let envFileKey: string | null = null;
  if (envLocalExists) {
    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf-8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('OPENAI_API_KEY=')) {
          const parts = line.split('=', 2);
          if (parts.length === 2) {
            envFileKey = parts[1].trim()
              .replace(/^["']+|["']+$/g, '')
              .replace(/\r?\n/g, '')
              .replace(/[\u200B-\u200D\uFEFF]/g, '')
              .trim();
            break;
          }
        }
      }
    } catch (error: any) {
      console.error('Failed to read .env.local:', error.message);
    }
  }
  
  // Use key from file if found, otherwise fallback to process.env
  const rawKey = envFileKey || process.env.OPENAI_API_KEY || null;
  const source = envFileKey ? '.env.local file' : 'process.env (system environment)';
  
  const results: {
    env_check: {
      key_exists: boolean;
      key_length: number;
      key_preview: string;
      key_starts_with: string;
      source: string;
      process_cwd?: string;
      env_file_path?: string;
      file_key_preview?: string;
      process_env_preview?: string;
    };
    module_check: {
      loaded: boolean;
      error?: string;
    };
    api_test: {
      status: string;
      error?: string;
      message?: string;
    };
  } = {
    env_check: {
      key_exists: false,
      key_length: 0,
      key_preview: '',
      key_starts_with: '',
      source: 'none',
    },
    module_check: {
      loaded: false,
    },
    api_test: {
      status: 'not_tested',
    },
  };

  if (rawKey) {
    // Clean the key
    let cleanKey = rawKey.trim()
      .replace(/^["']+|["']+$/g, '')
      .replace(/\r?\n/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    
    results.env_check = {
      key_exists: true,
      key_length: cleanKey.length,
      key_preview: cleanKey.length > 14 
        ? `${cleanKey.substring(0, 10)}...${cleanKey.substring(cleanKey.length - 4)}`
        : '***',
      key_starts_with: cleanKey.substring(0, 10),
      source: source,
      process_cwd: processCwd,
      env_file_path: envLocalPath,
      file_key_preview: envFileKey 
        ? `${envFileKey.substring(0, 10)}...${envFileKey.substring(envFileKey.length - 4)} (length: ${envFileKey.length})`
        : undefined,
      process_env_preview: process.env.OPENAI_API_KEY
        ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 6)} (length: ${process.env.OPENAI_API_KEY.length})`
        : undefined,
    };
    
    // Log for debugging
    console.log('=== OpenAI Key Debug ===');
    console.log('Process CWD:', processCwd);
    console.log('.env.local path:', envLocalPath);
    console.log('.env.local exists:', envLocalExists);
    if (envFileKey) {
      console.log('✅ Key from .env.local file:', `${envFileKey.substring(0, 15)}...${envFileKey.substring(envFileKey.length - 4)} (length: ${envFileKey.length})`);
    }
    if (process.env.OPENAI_API_KEY) {
      console.log('⚠️ Key from process.env:', `${process.env.OPENAI_API_KEY.substring(0, 15)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 6)} (length: ${process.env.OPENAI_API_KEY.length})`);
    }
    console.log('Using key from:', source);
    console.log('Clean key starts with:', cleanKey.substring(0, 15));
    console.log('Clean key ends with:', cleanKey.substring(Math.max(0, cleanKey.length - 6)));
    
    if (envFileKey && process.env.OPENAI_API_KEY && !envFileKey.includes(process.env.OPENAI_API_KEY.substring(10, 30))) {
      console.error('❌ CRITICAL: Keys do NOT match!');
      console.error('  .env.local key:', envFileKey.substring(0, 20) + '...');
      console.error('  process.env key:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
      console.error('Using key from .env.local file (ignoring process.env)');
    }
  } else {
    console.error('OPENAI_API_KEY not found in .env.local or process.env');
    console.error('Make sure:');
    console.error('1. .env.local exists at:', envLocalPath);
    console.error('2. File contains: OPENAI_API_KEY=sk-...');
    console.error('3. Server was restarted after adding the key');
  }

  // Check if module can be loaded
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAIModule = require('openai');
    const OpenAI = OpenAIModule.default || OpenAIModule;
    if (OpenAI) {
      results.module_check.loaded = true;
    }
  } catch (error: any) {
    results.module_check.error = error.message;
  }

  // Test API call if key exists and module loaded
  if (results.env_check.key_exists && results.module_check.loaded && rawKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OpenAIModule = require('openai');
      const OpenAI = OpenAIModule.default || OpenAIModule;
      
      // Clean the key again for API call
      let cleanKey = rawKey.trim()
        .replace(/^["']+|["']+$/g, '')
        .replace(/\r?\n/g, '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim();
      
      console.log('Testing API with key:', `${cleanKey.substring(0, 15)}...${cleanKey.substring(cleanKey.length - 4)}`);
      
      const openai = new OpenAI({
        apiKey: cleanKey,
      });

      // Make a simple test call
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "test successful" if you can read this.' },
        ],
        max_tokens: 10,
      });

      results.api_test.status = 'success';
      results.api_test.message = response.choices[0]?.message?.content || 'No response';
      console.log('✅ API test successful!');
    } catch (error: any) {
      results.api_test.status = 'failed';
      results.api_test.error = error.message || 'Unknown error';
      
      if (error.code === 'invalid_api_key' || error.status === 401) {
        results.api_test.error = `Invalid API Key (401): ${error.message}. The key might be expired, revoked, or incorrect. Check at https://platform.openai.com/account/api-keys`;
        console.error('❌ API Key Error - The key being used is invalid');
        console.error('Key being tested:', rawKey ? `${rawKey.substring(0, 20)}...${rawKey.substring(rawKey.length - 10)}` : 'null');
      } else {
        console.error('API Error:', error.message);
      }
    }
  } else {
    results.api_test.status = 'skipped';
    if (!results.env_check.key_exists) {
      results.api_test.error = 'Cannot test: OPENAI_API_KEY not found';
    } else if (!results.module_check.loaded) {
      results.api_test.error = 'Cannot test: OpenAI module failed to load';
    }
  }

  return NextResponse.json(results, { 
    status: results.api_test.status === 'success' ? 200 : 500 
  });
}
