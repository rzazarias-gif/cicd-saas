const assert = require("assert");

function addition(a, b) {
  return a + b;
}

assert.strictEqual(addition(2, 3), 5);

console.log("Test 1 : addition → OK");
console.log("Tous les tests sont réussis.");
