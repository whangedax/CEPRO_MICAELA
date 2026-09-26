/* APP-V2-CANDIDATE-01 valida el runtime convergente mediante la suite de paridad. */
const parity = require('./v2_functional_parity_01.regression.js');

async function run() {
  return parity.run();
}

module.exports = { name: 'APP-V2-CANDIDATE-01', run };
