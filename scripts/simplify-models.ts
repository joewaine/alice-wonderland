/**
 * Simplify GLB models using gltf-transform + meshoptimizer
 *
 * Decimates high-poly Tripo3D models to a target triangle count suitable
 * for a cel-shaded game. Run BEFORE compress-models.ts (Draco).
 *
 * Run with: npx tsx scripts/simplify-models.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.join(__dirname, '../public/assets/models');
const GARDEN_DIR = path.join(MODELS_DIR, 'garden');

// Target ratio: keep this fraction of original triangles
// Tripo3D outputs ~500k tris. For a cel-shaded N64-style game we want:
// NPCs ~5k tris, garden props ~2-5k tris
const TARGET_RATIO = 0.01;  // 1% of original
const TARGET_ERROR = 0.05;  // Allow more error for aggressive decimation

function getGlbFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.glb'))
    .map(f => path.join(dir, f));
}

async function main() {
  console.log('========================================');
  console.log('  GLB MODEL SIMPLIFIER');
  console.log('  gltf-transform + meshoptimizer');
  console.log(`  Target: ${(TARGET_RATIO * 100).toFixed(0)}% of original triangles`);
  console.log('========================================\n');

  await MeshoptSimplifier.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

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

  for (const file of allFiles) {
    const name = path.basename(file);
    const before = fs.statSync(file).size;

    try {
      const doc = await io.read(file);

      // Count triangles before
      let trisBefore = 0;
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const indices = prim.getIndices();
          if (indices) {
            trisBefore += indices.getCount() / 3;
          } else {
            const pos = prim.getAttribute('POSITION');
            if (pos) trisBefore += pos.getCount() / 3;
          }
        }
      }

      await doc.transform(
        dedup(),
        weld({ tolerance: 0.0001 }),
        simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_RATIO, error: TARGET_ERROR }),
        prune(),
      );

      // Count triangles after
      let trisAfter = 0;
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          const indices = prim.getIndices();
          if (indices) {
            trisAfter += indices.getCount() / 3;
          } else {
            const pos = prim.getAttribute('POSITION');
            if (pos) trisAfter += pos.getCount() / 3;
          }
        }
      }

      await io.write(file, doc);
      const after = fs.statSync(file).size;

      totalBefore += before;
      totalAfter += after;

      const sizeReduction = ((1 - after / before) * 100).toFixed(1);
      console.log(`  ${name}: ${Math.round(trisBefore)} → ${Math.round(trisAfter)} tris (${sizeReduction}% file size reduction)`);
    } catch (error) {
      console.error(`  ${name}: FAILED -`, error);
      totalBefore += before;
      totalAfter += before;
    }
  }

  const totalReduction = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  console.log('\n========================================');
  console.log(`  COMPLETE`);
  console.log(`  Size: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${totalReduction}%)`);
  console.log('========================================');
}

main().catch(console.error);
