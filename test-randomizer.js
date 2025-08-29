const fs = require('fs');
const path = require('path');

// Simulate browser environment
global.window = {};
global.fetch = async (url) => {
  const filePath = path.join(__dirname, url);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    return { json: async () => JSON.parse(content) };
  }
  throw new Error('File not found: ' + url);
};

// Load modules
const { GameState } = require('./js/gameState.js');
const { Location, LocationCollection } = require('./js/location.js');
const { ITEM_FREQUENCIES, ItemPool } = require('./js/itemPool.js');
const { buildExpr, jsonToLambda, loadLogicFromJson, StateLogic } = require('./js/parser.js');

// Make globals available
global.GameState = GameState;
global.Location = Location;
global.LocationCollection = LocationCollection;
global.ITEM_FREQUENCIES = ITEM_FREQUENCIES;
global.ItemPool = ItemPool;
global.buildExpr = buildExpr;
global.jsonToLambda = jsonToLambda;
global.loadLogicFromJson = loadLogicFromJson;
global.StateLogic = StateLogic;

// Load generate.js as text and eval it (since it's not a module)
const generateCode = fs.readFileSync('./js/generate.js', 'utf8');
eval(generateCode);

// Mock document for download functionality in Node.js
global.document = {
  createElement: () => ({
    click: () => console.log('✅ Download triggered (mocked in Node.js)'),
    style: {},
    href: '',
    download: ''
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  }
};

global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {}
};

global.Blob = class Blob {
  constructor(data, options) {
    this.data = data;
    this.type = options?.type || 'text/plain';
  }
};

// Run the test
console.log('Starting randomizer test...');
generate().then(result => {
  console.log('=== TEST RESULTS ===');
  console.log('Success:', result.success);
  console.log('Seed:', result.seed);
  console.log('Total locations:', result.stats.totalLocations);
  console.log('Items placed:', result.stats.itemsPlaced);
  console.log('Spoiler spheres:', result.spoiler?.itemSpheres?.length || 0);
  if (result.spoiler?.itemSpheres?.length > 0) {
    console.log('First sphere items:', result.spoiler.itemSpheres[0]?.items?.length || 0);
    console.log('Last sphere items:', result.spoiler.itemSpheres[result.spoiler.itemSpheres.length - 1]?.items?.length || 0);
  }
  if (result.error) {
    console.log('Error:', result.error);
  }
  console.log('=== END RESULTS ===');
}).catch(error => {
  console.error('Test failed:', error.message);
  console.error(error.stack);
});