/**
 * Compress GLB models using gltf-transform + Draco
 *
 * Reads all .glb files from public/assets/models/ and public/assets/models/garden/,
 * applies Draco compression with conservative settings safe for skeletal animation.
 *
 * Run with: npx tsx scripts/compress-models.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, dedup, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../public/assets/models');
const GARDEN_DIR = path.join(MODELS_DIR, 'garden');

/**
 * Collect all .glb files from a directory (non-recursive)
 */
function getGlbFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.glb'))
    .map(f => path.join(dir, f));
}

/**
 * Check if a GLB already has Draco compression by looking for the extension
 */
async function isDracoCompressed(io: NodeIO, filePath: string): Promise<boolean> {
  try {
    const doc = await io.read(filePath);
    const root = doc.getRoot();
    // Check if any mesh primitive uses Draco
    for (const mesh of root.listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        if (prim.getExtension('KHR_draco_mesh_compression')) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function compressFile(io: NodeIO, filePath: string): Promise<{ before: number; after: number }> {
  const before = fs.statSync(filePath).size;
  const name = path.basename(filePath);

  // Read the document
  const doc = await io.read(filePath);

  // Apply optimizations:
  // 1. Remove duplicate accessors/textures
  await doc.transform(dedup());
  // 2. Remove unused resources
  await doc.transform(prune());
  // 3. Apply Draco compression with conservative settings
  await doc.transform(
    draco({
      quantizePosition: 14,    // Safe for skeletal animation
      quantizeNormal: 10,
      quantizeTexcoord: 12,
      quantizeColor: 8,
    })
  );

  // Write back
  await io.write(filePath, doc);

  const after = fs.statSync(filePath).size;
  const reduction = ((1 - after / before) * 100).toFixed(1);
  console.log(`  ${name}: ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB (${reduction}% reduction)`);

  return { before, after };
}

async function main() {
  console.log('========================================');
  console.log('  GLB MODEL COMPRESSOR');
  console.log('  gltf-transform + Draco');
  console.log('========================================\n');

  // Initialize IO with Draco support
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  // Collect all GLB files
  const npcFiles = getGlbFiles(MODELS_DIR);
  const gardenFiles = getGlbFiles(GARDEN_DIR);
  const allFiles = [...npcFiles, ...gardenFiles];

  if (allFiles.length === 0) {
    console.log('No .glb files found.');
    return;
  }

  console.log(`Found ${allFiles.length} GLB files (${npcFiles.length} NPC, ${gardenFiles.length} garden)\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of allFiles) {
    const name = path.basename(file);
    try {
      // Check if already compressed
      if (await isDracoCompressed(io, file)) {
        console.log(`  ${name}: already compressed, skipping`);
        const size = fs.statSync(file).size;
        totalBefore += size;
        totalAfter += size;
        skipped++;
        continue;
      }

      const result = await compressFile(io, file);
      totalBefore += result.before;
      totalAfter += result.after;
      compressed++;
    } catch (error) {
      console.error(`  ${name}: FAILED -`, error);
      failed++;
    }
  }

  const totalReduction = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log('\n========================================');
  console.log(`  COMPLETE: ${compressed} compressed, ${skipped} skipped, ${failed} failed`);
  console.log(`  Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${totalReduction}% reduction)`);
  console.log('========================================');
}

main().catch(console.error);
