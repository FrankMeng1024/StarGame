// Modify DevTools localStorage to show console at bottom with visible simulator
const fs = require('fs');
const path = 'C:\\Users\\I585134\\AppData\\Local\\微信开发者工具\\User Data\\044bf03fa38676d38f027121f784a4ad\\WeappLocalData\\localstorage_efc7b5286d3888a463756fabc08d04b2.json';

const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Layout: hide editor, simulator fills right side, debug console visible at bottom
data.editor = data.editor || {};
data.editor.show = false;
data.editor.fileTreeShow = false;

// Make simulator width fit within 1280 window
// With no editor panel, simulator can be ~1000px wide but we want ~500 for game + console visible
data.simulator = data.simulator || {};
data.simulator.show = true;
data.simulator.popup = false;
data.simulator.width = 500;  // Smaller so game fits and console is accessible

// Debug console visible at bottom with decent height
data.debug = data.debug || {};
data.debug.show = true;
data.debug.popup = false;
data.debug.height = 200;  // Make console taller so we can see and click it
data.debug.width = 300;

// Clear mask
data.mask = { show: false };

// Window at 0,0
data.windowStatus = {
  mode: 'NORMAL',
  position: { x: 0, y: 0, width: 1280, height: 800 },
  mini: false
};

fs.writeFileSync(path, JSON.stringify(data));
console.log('Layout JSON updated');
console.log('editor.show:', data.editor.show);
console.log('simulator.width:', data.simulator.width);
console.log('debug.show:', data.debug.show);
console.log('debug.height:', data.debug.height);
