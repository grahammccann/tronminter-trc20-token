require("@nomicfoundation/hardhat-toolbox");

// TRON runs the TVM, which is EVM-compatible for this contract, so the tests
// run on Hardhat's local EVM. Deploying to TRON uses TronWeb (scripts/deploy.js).
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
};
