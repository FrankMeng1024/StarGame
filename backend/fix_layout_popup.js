// Modify layout JSON to float simulator as popup window
const fs = require('fs');
const path = 'C:\\Users\\I585134\\AppData\\Local\\微信开发者工具\\User Data\\044bf03fa38676d38f027121f784a4ad\\WeappLocalData\\localstorage_efc7b5286d3888a463756fabc08d04b2.json';

const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Try popup mode for simulator - should create a floating window
data.simulator = data.simulator || {};
data.simulator.show = true;
data.simulator.popup = true;   // Float as popup window
data.simulator.width = 667;    // Full game canvas width

// Minimal editor
data.editor = data.editor || {};
data.editor.show = false;
data.editor.fileTreeShow = false;

// Keep debug off since we don't need it for popup
data.debug = data.debug || {};
data.debug.show = false;
data.debug.popup = false;

data.mask = { show: false };

fs.writeFileSync(path, JSON.stringify(data));
console.log('Popup layout set');
console.log('simulator.popup:', data.simulator.popup);
console.log('simulator.width:', data.simulator.width);
