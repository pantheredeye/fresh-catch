#!/usr/bin/env node

/**
 * Figma Token Exporter
 *
 * Converts tokens.css → tokens.json for Figma Tokens plugin
 * Run: node scripts/export-tokens.js
 * Output: src/design-system/tokens.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokensPath = path.join(__dirname, '../src/design-system/tokens.css');
const outputPath = path.join(__dirname, '../src/design-system/tokens.json');

// Read tokens.css
const css = fs.readFileSync(tokensPath, 'utf8');

// Parse CSS custom properties from :root
const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
if (!rootMatch) {
  console.error('Could not find :root block in tokens.css');
  process.exit(1);
}

const rootCSS = rootMatch[1];

// Parse dark mode overrides
const darkModeMatch = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]+)\}/);
const darkModeCSS = darkModeMatch ? darkModeMatch[1] : '';

/**
 * Extract CSS variables from a CSS block
 * Returns: { varName: value }
 */
function extractVars(cssText) {
  const vars = {};
  const varRegex = /--([a-z0-9-]+):\s*([^;]+);/g;
  let match;

  while ((match = varRegex.exec(cssText)) !== null) {
    const [, name, value] = match;
    vars[name] = value.trim();
  }

  return vars;
}

const lightVars = extractVars(rootCSS);
const darkVars = extractVars(darkModeCSS);

/**
 * Convert CSS value to Figma token format
 */
function convertValue(value, type) {
  // Remove comments
  value = value.replace(/\/\*.*?\*\//g, '').trim();

  return {
    value: value,
    type: type || 'other'
  };
}

/**
 * Categorize tokens by type
 */
function categorizeTokens(vars) {
  const tokens = {
    color: {},
    spacing: {},
    sizing: {},
    borderRadius: {},
    borderWidth: {},
    fontFamilies: {},
    fontSizes: {},
    fontWeights: {},
    lineHeights: {},
    boxShadow: {},
    other: {}
  };

  for (const [name, value] of Object.entries(vars)) {
    let category = 'other';
    let type = 'other';

    // Color tokens
    if (name.includes('color') || name.includes('gradient') ||
        name.includes('blue') || name.includes('coral') ||
        name.includes('mint') || name.includes('gold') ||
        name.includes('navy') || name.includes('gray') ||
        name.includes('white') || name.includes('background') ||
        name.includes('surface') || name.includes('glass') ||
        name.includes('border') && !name.includes('radius') && !name.includes('width')) {
      category = 'color';
      type = 'color';
    }
    // Spacing tokens
    else if (name.startsWith('space-')) {
      category = 'spacing';
      type = 'spacing';
    }
    // Sizing tokens
    else if (name.startsWith('width-')) {
      category = 'sizing';
      type = 'sizing';
    }
    // Border radius
    else if (name.startsWith('radius-')) {
      category = 'borderRadius';
      type = 'borderRadius';
    }
    // Border width
    else if (name.startsWith('border-width')) {
      category = 'borderWidth';
      type = 'borderWidth';
    }
    // Font families
    else if (name.startsWith('font-') && !name.includes('size') && !name.includes('weight')) {
      category = 'fontFamilies';
      type = 'fontFamilies';
    }
    // Font sizes
    else if (name.startsWith('font-size-')) {
      category = 'fontSizes';
      type = 'fontSizes';
    }
    // Font weights
    else if (name.startsWith('font-weight-')) {
      category = 'fontWeights';
      type = 'fontWeights';
    }
    // Line heights
    else if (name.startsWith('line-height-')) {
      category = 'lineHeights';
      type = 'lineHeights';
    }
    // Shadows
    else if (name.startsWith('shadow-')) {
      category = 'boxShadow';
      type = 'boxShadow';
    }

    tokens[category][name] = convertValue(value, type);
  }

  return tokens;
}

// Build Figma Tokens format
const figmaTokens = {
  global: categorizeTokens(lightVars),
  themes: {
    light: {
      $description: 'Light mode theme',
      ...Object.fromEntries(
        Object.entries(lightVars).map(([name, value]) => [
          name,
          { value: `{global.*.${name}}`, type: 'other' }
        ])
      )
    },
    dark: {
      $description: 'Dark mode theme',
      ...Object.fromEntries(
        Object.entries(darkVars).map(([name, value]) => [
          name,
          convertValue(value, 'other')
        ])
      )
    }
  }
};

// Write to file
fs.writeFileSync(outputPath, JSON.stringify(figmaTokens, null, 2), 'utf8');

console.log(`✅ Figma tokens exported to ${outputPath}`);
console.log(`📊 Exported ${Object.keys(lightVars).length} light mode tokens`);
console.log(`📊 Exported ${Object.keys(darkVars).length} dark mode overrides`);
console.log('\nToken categories:');
Object.entries(figmaTokens.global).forEach(([category, tokens]) => {
  const count = Object.keys(tokens).length;
  if (count > 0) {
    console.log(`  - ${category}: ${count} tokens`);
  }
});
console.log('\n💡 Import tokens.json to Figma using the Figma Tokens plugin');
