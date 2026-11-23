// Deploys contracts/TRC20Token.sol to TRON with TronWeb.
// Usage: node scripts/deploy.js nile      (Nile testnet)
//        node scripts/deploy.js mainnet
// Run `npx hardhat compile` first. Settings come from .env (see .env.example).
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const TronWeb = require("tronweb"); // TronWeb 5.x

const HOSTS = {
  nile: "https://nile.trongrid.io",
  mainnet: "https://api.trongrid.io",
};

async function main() {
  const network = process.argv[2] || "nile";
  const fullHost = HOSTS[network];
  if (!fullHost) throw new Error(`Unknown network "${network}". Use nile or mainnet.`);
  if (!process.env.PRIVATE_KEY) throw new Error("Set PRIVATE_KEY in .env");

  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "TRC20Token.sol", "TRC20Token.json");
  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const headers = process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : {};
  const tronWeb = new TronWeb({ fullHost, headers, privateKey: process.env.PRIVATE_KEY });

  const recipient = process.env.TOKEN_RECIPIENT || tronWeb.defaultAddress.base58;
  const feeBps = Number(process.env.TRANSFER_FEE_BPS || 0);
  const feeRecipient = process.env.FEE_RECIPIENT || recipient;

  const tx = await tronWeb.transactionBuilder.createSmartContract({
    abi,
    bytecode: bytecode.replace(/^0x/, ""),
    feeLimit: 1_000_000_000, // 1,000 TRX ceiling, the actual cost is usually far lower
    callValue: 0,
    userFeePercentage: 100,
    originEnergyLimit: 10_000_000,
    name: "TRC20Token",
    parameters: [
      process.env.TOKEN_NAME || "Example Token",
      (process.env.TOKEN_SYMBOL || "EXT").toUpperCase(),
      Number(process.env.TOKEN_DECIMALS || 6),
      String(process.env.TOKEN_SUPPLY || "1000000000"),
      tronWeb.address.toHex(recipient),
      process.env.RENOUNCE_OWNER === "true",
      process.env.MINTABLE === "true",
      process.env.BURNABLE === "true",
      process.env.PAUSABLE === "true",
      String(process.env.MAX_TX || "0"),
      feeBps,
      tronWeb.address.toHex(feeRecipient),
    ],
  }, tronWeb.defaultAddress.hex);

  const signed = await tronWeb.trx.sign(tx);
  const result = await tronWeb.trx.sendRawTransaction(signed);
  if (!result.result) throw new Error("Broadcast failed: " + JSON.stringify(result));

  const address = tronWeb.address.fromHex(tx.contract_address);
  const explorer = network === "mainnet" ? "https://tronscan.org" : "https://nile.tronscan.org";
  console.log(`Token contract: ${address}`);
  console.log(`Transaction:    ${explorer}/#/transaction/${result.txid}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
