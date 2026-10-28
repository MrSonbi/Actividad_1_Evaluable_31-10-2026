import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

const envPath = resolve(process.cwd(), '.env');
const envOut = resolve(process.cwd(), 'src/environments/environment.ts');
const envExample = resolve(process.cwd(), '.env.example');
const envTsExample = resolve(process.cwd(), 'environment.example.ts');

const args = process.argv.slice(2);
const isProd = args.includes('--prod') || process.env.NODE_ENV === 'production';

const getEnv = (key) => {
  const fromProcess = process.env[key];
  if (fromProcess !== undefined && fromProcess.trim()) return fromProcess.trim();
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (k === key) return v.replace(/^["']|["']$/g, '');
    }
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_KEY');

const content = `export const environment = {
  production: ${isProd ? 'true' : 'false'},
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
};
`;

mkdirSync(dirname(envOut), { recursive: true });
writeFileSync(envOut, content, 'utf8');
console.log('Generated src/environments/environment.ts');

if (!existsSync(envExample)) {
  writeFileSync(envExample, 'SUPABASE_URL=\nSUPABASE_KEY=\n', 'utf8');
}
if (!existsSync(envTsExample)) {
  writeFileSync(
    envTsExample,
    `export const environment = {
  production: false,
  supabaseUrl: '',
  supabaseKey: '',
};
`,
    'utf8',
  );
}
