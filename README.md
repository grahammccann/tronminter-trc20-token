# TronMinter TRC-20 Token Contract

The TRC-20 token contract that [TronMinter](https://www.tronminter.com/) deploys on the TRON network. Every token created on TronMinter uses this source.

## Project overview

| | |
|---|---|
| Project | TronMinter |
| Website | https://www.tronminter.com/ |
| Category | Tools (no-code TRC-20 token creator) |
| Network | TRON mainnet |
| Wallet | TronLink |
| Price | Flat 249 TRX per token |
| Own token | None |
| Contact | contact@tronminter.com |

TronMinter lets anyone create a TRC-20 token without writing code. The creator enters a name, symbol, decimals and supply, picks any optional features, then pays the flat fee from TronLink. Once the payment confirms, TronMinter deploys this contract in about 120 seconds. The whole supply goes straight to the creator's wallet. Ownership goes to the creator, or is renounced to the zero address if they ask for that. The deploying wallet never holds supply or ownership.

## What the contract does

- Standard TRC-20 interface: `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `transfer`, `approve`, `allowance`, `transferFrom`
- The full supply is minted once in the constructor to the creator's address
- Optional features, chosen at deploy and fixed for good:
  - **Mintable:** the owner can mint more tokens
  - **Burnable:** holders can burn their own tokens
  - **Pausable:** the owner can pause and unpause transfers
  - **Max transaction:** a cap on a single transfer (0 means no cap)
  - **Transfer fee:** a fee in basis points sent to a fee wallet, capped at 25%
- The max transaction and transfer fee are `immutable`, so they can never be raised after launch
- The owner and the fee wallet are exempt from the limit and the fee, so adding liquidity is not taxed
- Simple ownership with `transferOwnership` and `renounceOwnership`

### Constructor

```solidity
constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals,
    uint256 _initialSupplyWhole,  // whole tokens, scaled by 10 ** _decimals
    address _recipient,           // creator wallet, receives the full supply and ownership
    bool _renounceOwner,          // true sets the owner to the zero address at deploy
    bool _mintable,
    bool _burnable,
    bool _pausable,
    uint256 _maxTxWhole,          // 0 = no limit
    uint16 _transferFeeBps,       // 100 = 1%, capped at 2500
    address _feeRecipient         // fee destination, ignored when the fee is 0
)
```

## Build and test

```bash
npm install
npx hardhat compile
npx hardhat test
```

Compiler: solc 0.8.20, optimizer enabled with 200 runs, `viaIR` on. These are the settings used in production. TRON runs the TVM, which is EVM-compatible for this contract, so the tests run on Hardhat's local EVM.

## Deploy your own copy

Copy `.env.example` to `.env`, add a funded TRON private key and the token settings, then run:

```bash
npx hardhat compile
npm run deploy:nile      # Nile testnet
npm run deploy:mainnet   # TRON mainnet
```

Get free Nile test TRX from the Nile faucet before deploying to the testnet.

## Repository layout

```
contracts/TRC20Token.sol   the deployed token contract
scripts/deploy.js          TronWeb deploy script for Nile and mainnet
test/TRC20Token.test.js    unit tests
hardhat.config.js          compiler settings
```

## Links

- Website: https://www.tronminter.com/
- How to create a TRON token: https://www.tronminter.com/how-to-create-a-tron-token/
- TRON token cost: https://www.tronminter.com/tron-token-cost/

## License

MIT
