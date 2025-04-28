import { testMovingAverageStrategy } from '../lib/strategy-test';

// Run the test
console.log("Running Moving Average Strategy Test...\n");
const results = testMovingAverageStrategy();

// You can access the results if needed
console.log("\nTest Results Summary:");
console.log(JSON.stringify(results, null, 2)); 