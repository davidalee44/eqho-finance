#!/usr/bin/env node
/**
 * Environment Variable Validator
 * 
 * Validates required environment variables before build.
 * Works for both frontend (VITE_*) and can call backend validator.
 * 
 * Usage:
 *   node scripts/validate-env.js           # Validate frontend vars
 *   node scripts/validate-env.js --backend # Validate backend vars too
 *   node scripts/validate-env.js --ci      # CI mode (exit 1 on error)
 */

const fs = require('fs');
const path = require('path');

// Frontend environment variables (VITE_* prefix for Vite)
const FRONTEND_ENV_VARS = [
  {
    name: 'VITE_API_URL',
    required: true,
    description: 'Backend API URL (e.g., http://localhost:8000)',
    example: 'http://localhost:8000',
  },
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    example: 'https://xxx.supabase.co',
  },
  {
    name: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    secret: true,
  },
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;
    
    const [key, ...valueParts] = line.split('=');
    if (key) {
      let value = valueParts.join('=').trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key.trim()] = value;
    }
  });
  
  return env;
}

function validateFrontendEnv(envVars, ciMode = false) {
  console.log('\n' + '='.repeat(60));
  log('cyan', 'Frontend Environment Variable Validation');
  console.log('='.repeat(60) + '\n');
  
  const missingRequired = [];
  const missingOptional = [];
  const configured = [];
  
  for (const varDef of FRONTEND_ENV_VARS) {
    const value = envVars[varDef.name] || process.env[varDef.name];
    
    if (value) {
      configured.push(varDef.name);
      const displayValue = varDef.secret 
        ? '***' 
        : (value.length > 30 ? value.substring(0, 30) + '...' : value);
      log('green', `  ✓ ${varDef.name}: ${displayValue}`);
    } else {
      if (varDef.required) {
        missingRequired.push(varDef);
        log('red', `  ✗ ${varDef.name}: MISSING (required)`);
        console.log(`      ${varDef.description}`);
        if (varDef.example) {
          console.log(`      Example: ${varDef.example}`);
        }
      } else {
        missingOptional.push(varDef.name);
        log('yellow', `  ○ ${varDef.name}: not set (optional)`);
      }
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Configured: ${configured.length} | Missing Required: ${missingRequired.length} | Missing Optional: ${missingOptional.length}`);
  console.log('='.repeat(60) + '\n');
  
  if (missingRequired.length > 0) {
    log('red', '❌ Frontend build cannot proceed - missing required environment variables\n');
    
    console.log('To fix, create a .env file with:');
    console.log('-'.repeat(40));
    for (const varDef of missingRequired) {
      console.log(`${varDef.name}=${varDef.example || 'your-value-here'}`);
    }
    console.log('-'.repeat(40) + '\n');
    
    if (ciMode) {
      process.exit(1);
    }
    return false;
  }
  
  log('green', '✅ Frontend environment validation passed\n');
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const ciMode = args.includes('--ci');
  const checkBackend = args.includes('--backend');
  
  console.log('\n🔍 Validating environment variables...\n');
  
  // Load .env files
  const rootEnv = loadEnvFile(path.join(process.cwd(), '.env'));
  const localEnv = loadEnvFile(path.join(process.cwd(), '.env.local'));
  
  // Merge with local taking precedence
  const mergedEnv = { ...rootEnv, ...localEnv };
  
  // Validate frontend
  const frontendValid = validateFrontendEnv(mergedEnv, ciMode);
  
  // Validate backend if requested
  if (checkBackend) {
    console.log('Running backend validation...\n');
    const { execSync } = require('child_process');
    try {
      execSync('cd backend && python -m app.core.env_validator', {
        stdio: 'inherit',
        env: { ...process.env, ...mergedEnv },
      });
    } catch (error) {
      if (ciMode) {
        process.exit(1);
      }
    }
  }
  
  if (!frontendValid && ciMode) {
    process.exit(1);
  }
}

main();

