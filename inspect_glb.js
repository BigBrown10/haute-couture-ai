const fs = require('fs');

async function inspectGLB() {
    try {
        // Use standard Node.js buffer reading to extract GLB JSON chunk
        const buffer = fs.readFileSync('public/models/tony-model.glb');
        const magic = buffer.readUInt32LE(0);
        if (magic !== 0x46546C67) {
            console.log("Not a valid GLB");
            return;
        }

        const jsonChunkLength = buffer.readUInt32LE(12);
        const jsonChunkType = buffer.readUInt32LE(16);
        if (jsonChunkType !== 0x4E4F534A) {
            console.log("First chunk is not JSON");
            return;
        }

        const jsonBuffer = buffer.subarray(20, 20 + jsonChunkLength);
        const gltf = JSON.parse(jsonBuffer.toString('utf8'));

        console.log("--- BONE/NODE NAMES ---");
        const nodes = gltf.nodes || [];
        nodes.forEach(n => {
            if (n.name && (n.name.toLowerCase().includes('arm') || n.name.toLowerCase().includes('shoulder') || n.name.toLowerCase().includes('spine') || n.name.toLowerCase().includes('neck') || n.name.toLowerCase().includes('head') || n.name.toLowerCase().includes('jaw') || n.name.toLowerCase().includes('mouth'))) {
                console.log(n.name);
            }
        });

        console.log("\n--- MESH NAMES & MORPH TARGETS ---");
        const meshes = gltf.meshes || [];
        meshes.forEach(m => {
            console.log("Mesh:", m.name);
            if (m.extras && m.extras.targetNames) {
                console.log("  Morph Targets:", m.extras.targetNames);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

inspectGLB();
