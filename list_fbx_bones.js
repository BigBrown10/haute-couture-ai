const fs = require('fs');
const path = require('path');

function findBoneNames(filePath) {
    const buffer = fs.readFileSync(filePath);
    // Find strings that look like mixamorig
    const regex = /mixamorig[A-Za-z0-9]+/g;
    const matches = buffer.toString('utf8').match(regex);
    if (!matches) {
        console.log('No mixamorig matches found');
        return;
    }
    const names = new Set(matches);
    console.log('Found names:');
    Array.from(names).sort().forEach(name => console.log(name));
}

const fbxPath = path.join(__dirname, 'public', 'animations', 'Breathing Idle.fbx');
findBoneNames(fbxPath);
