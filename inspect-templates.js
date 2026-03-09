const fs = require('fs');
const path = require('path');

const dataFile = path.join(process.cwd(), 'data/templates.json');

try {
  const data = fs.readFileSync(dataFile, 'utf-8');
  const templates = JSON.parse(data);

  console.log('Found', templates.length, 'templates.');

  templates.forEach((t, index) => {
    console.log(`\n[Template ${index + 1}]`);
    console.log(`Name: ${t.name}`);
    console.log(`ID: ${t.id}`);
    console.log('Bound Elements:');
    
    if (t.elements && t.elements.length > 0) {
      const boundElements = t.elements.filter(e => e.isEditable && e.cozeField);
      if (boundElements.length === 0) {
        console.log('  (No elements bound to Coze fields)');
      } else {
        boundElements.forEach(e => {
          console.log(`  - Layer: "${e.name}" (ID: ${e.id}) -> Tag: [${e.cozeField}] (${e.type})`);
        });
      }
      
      const unboundElements = t.elements.filter(e => e.isEditable && !e.cozeField);
      if (unboundElements.length > 0) {
        console.log('Unbound Editable Elements:');
        unboundElements.forEach(e => {
          console.log(`  - Layer: "${e.name}" (ID: ${e.id}) -> (No Tag)`);
        });
      }
    } else {
      console.log('  (No elements configuration found)');
    }
  });

} catch (error) {
  console.error('Error reading templates:', error.message);
}