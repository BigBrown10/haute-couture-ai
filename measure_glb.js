// Simple GLB parser - no deps
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'models', 'tony.glb');
const buffer = fs.readFileSync(filePath);
const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

// GLB header
const jsonLength = view.getUint32(12, true);
const jsonData = buffer.slice(20, 20 + jsonLength).toString('utf-8');
const gltf = JSON.parse(jsonData);

console.log('=== tony.glb Model Analysis ===\n');

// Check nodes for translation/scale
console.log('--- Root Nodes with transforms ---');
if (gltf.nodes) {
    gltf.nodes.forEach((node, i) => {
        if (node.translation || node.scale || node.name === 'Hips' || node.name === 'Armature') {
            console.log(`  Node[${i}] "${node.name}":`, 
                node.translation ? `pos=[${node.translation.map(v=>v.toFixed(4))}]` : '',
                node.scale ? `scale=[${node.scale.map(v=>v.toFixed(4))}]` : '',
                node.mesh !== undefined ? `mesh=${node.mesh}` : '');
        }
    });
}

// Check mesh position accessors for bounding box
console.log('\n--- Position Accessor Bounds (mesh geometry) ---');
if (gltf.meshes && gltf.accessors) {
    gltf.meshes.forEach((mesh, mi) => {
        mesh.primitives?.forEach((prim, pi) => {
            const posIdx = prim.attributes?.POSITION;
            if (posIdx !== undefined) {
                const acc = gltf.accessors[posIdx];
                if (acc.min && acc.max) {
                    console.log(`  Mesh[${mi}] "${mesh.name}" prim[${pi}]:`,
                        `min=[${acc.min.map(v=>v.toFixed(4))}]`,
                        `max=[${acc.max.map(v=>v.toFixed(4))}]`);
                }
            }
        });
    });
}

// Overall bounding box
let globalMin = [Infinity, Infinity, Infinity];
let globalMax = [-Infinity, -Infinity, -Infinity];
if (gltf.meshes && gltf.accessors) {
    gltf.meshes.forEach(mesh => {
        mesh.primitives?.forEach(prim => {
            const posIdx = prim.attributes?.POSITION;
            if (posIdx !== undefined) {
                const acc = gltf.accessors[posIdx];
                if (acc.min && acc.max) {
                    for (let i = 0; i < 3; i++) {
                        globalMin[i] = Math.min(globalMin[i], acc.min[i]);
                        globalMax[i] = Math.max(globalMax[i], acc.max[i]);
                    }
                }
            }
        });
    });
}
console.log('\n--- Combined Bounding Box ---');
console.log(`  Min: [${globalMin.map(v=>v.toFixed(4))}]`);
console.log(`  Max: [${globalMax.map(v=>v.toFixed(4))}]`);
console.log(`  Size: [${globalMin.map((v,i) => (globalMax[i]-v).toFixed(4))}]`);
console.log(`  Height (Y): ${(globalMax[1]-globalMin[1]).toFixed(4)}`);
console.log(`  Center Y: ${((globalMax[1]+globalMin[1])/2).toFixed(4)}`);
