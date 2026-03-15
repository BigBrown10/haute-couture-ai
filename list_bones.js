const fs = require('fs');

async function inspectGLB() {
    try {
        const buffer = fs.readFileSync('public/models/tony.glb');
        const jsonChunkLength = buffer.readUInt32LE(12);
        const jsonBuffer = buffer.subarray(20, 20 + jsonChunkLength);
        const gltf = JSON.parse(jsonBuffer.toString('utf8'));

        console.log("--- BONE/NODE NAMES ---");
        gltf.nodes.forEach(n => {
            if (n.name) console.log(n.name);
        });
    } catch (e) {
        console.error(e);
    }
}

inspectGLB();
