// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * TRC20Token - standard TRC-20 with optional mint/burn/pause and ownership.
 *
 * SAFETY INVARIANT (do not change): the constructor mints the ENTIRE supply to
 * `recipient` (the paying customer) and sets the owner to `recipient` - or to
 * address(0) when `renounceOwner` is true. The deploying account (the minter
 * hot wallet) NEVER receives supply or ownership.
 */
contract TRC20Token {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;

    address public owner;
    bool public immutable mintable;
    bool public immutable burnable;
    bool public immutable pausable;
    bool public paused;

    // Phase-1 features. All IMMUTABLE: set once at deploy, can NEVER be changed -
    // so a tax can't be raised on holders and a limit can't be weaponised later.
    uint256 public immutable maxTxAmount;     // 0 = no limit (in base units)
    uint16  public immutable transferFeeBps;  // fee in basis points, capped at 2500 (25%)
    address public immutable feeRecipient;    // where the transfer fee is sent

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address account);
    event Unpaused(address account);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupplyWhole,
        address _recipient,
        bool _renounceOwner,
        bool _mintable,
        bool _burnable,
        bool _pausable,
        uint256 _maxTxWhole,      // 0 = no limit
        uint16 _transferFeeBps,   // basis points (100 = 1%), capped at 2500
        address _feeRecipient     // fee destination; ignored when fee is 0
    ) {
        require(_recipient != address(0), "Recipient is zero");
        require(_transferFeeBps <= 2500, "Fee too high");

        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        mintable = _mintable;
        burnable = _burnable;
        pausable = _pausable;

        maxTxAmount    = _maxTxWhole == 0 ? 0 : _maxTxWhole * (10 ** uint256(_decimals));
        transferFeeBps = _transferFeeBps;
        feeRecipient   = (_transferFeeBps > 0 && _feeRecipient != address(0)) ? _feeRecipient : address(0);

        uint256 supply = _initialSupplyWhole * (10 ** uint256(_decimals));
        totalSupply = supply;
        _balances[_recipient] = supply;            // entire supply -> customer
        emit Transfer(address(0), _recipient, supply);

        // Ownership -> customer, or burned at birth if renounced.
        owner = _renounceOwner ? address(0) : _recipient;
        emit OwnershipTransferred(address(0), owner);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address account, address spender) external view returns (uint256) {
        return _allowances[account][spender];
    }

    function transfer(address to, uint256 value) external whenNotPaused returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external whenNotPaused returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= value, "Allowance exceeded");
        if (allowed != type(uint256).max) {
            _allowances[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "Transfer to zero");

        // Owner and the fee wallet are exempt (so adding liquidity / fee forwarding isn't taxed or limited).
        bool exempt = (from == owner || to == owner || from == feeRecipient || to == feeRecipient);

        if (maxTxAmount > 0 && !exempt) {
            require(value <= maxTxAmount, "Exceeds max tx");
        }

        uint256 bal = _balances[from];
        require(bal >= value, "Balance exceeded");
        unchecked { _balances[from] = bal - value; }

        uint256 sendAmount = value;
        if (transferFeeBps > 0 && feeRecipient != address(0) && !exempt) {
            uint256 fee = (value * transferFeeBps) / 10000;
            if (fee > 0) {
                _balances[feeRecipient] += fee;
                emit Transfer(from, feeRecipient, fee);
                sendAmount = value - fee;
            }
        }

        _balances[to] += sendAmount;
        emit Transfer(from, to, sendAmount);
    }

    // ---- Optional: mint ----
    function mint(address to, uint256 value) external onlyOwner {
        require(mintable, "Not mintable");
        require(to != address(0), "Mint to zero");
        totalSupply += value;
        _balances[to] += value;
        emit Transfer(address(0), to, value);
    }

    // ---- Optional: burn ----
    function burn(uint256 value) external {
        require(burnable, "Not burnable");
        _burn(msg.sender, value);
    }

    function burnFrom(address from, uint256 value) external {
        require(burnable, "Not burnable");
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= value, "Allowance exceeded");
        if (allowed != type(uint256).max) {
            _allowances[from][msg.sender] = allowed - value;
        }
        _burn(from, value);
    }

    function _burn(address from, uint256 value) internal {
        uint256 bal = _balances[from];
        require(bal >= value, "Balance exceeded");
        unchecked { _balances[from] = bal - value; totalSupply -= value; }
        emit Transfer(from, address(0), value);
    }

    // ---- Optional: pause ----
    function pause() external onlyOwner {
        require(pausable, "Not pausable");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(pausable, "Not pausable");
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ---- Ownership ----
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }
}
