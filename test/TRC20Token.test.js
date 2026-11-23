const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO = "0x0000000000000000000000000000000000000000";

describe("TRC20Token", function () {
  async function deploy(opts = {}) {
    const [deployer, creator, other, feeWallet] = await ethers.getSigners();
    const o = {
      renounce: false, mintable: false, burnable: false, pausable: false,
      maxTx: 0n, feeBps: 0, feeRecipient: ZERO, ...opts,
    };
    const token = await ethers.deployContract("TRC20Token", [
      "Test Token", "TST", 6, 1000000n, creator.address,
      o.renounce, o.mintable, o.burnable, o.pausable,
      o.maxTx, o.feeBps, o.feeRecipient === "fee" ? feeWallet.address : o.feeRecipient,
    ]);
    return { token, deployer, creator, other, feeWallet };
  }

  it("mints the whole supply to the creator, never the deployer", async function () {
    const { token, deployer, creator } = await deploy();
    const total = 1000000n * 10n ** 6n;
    expect(await token.totalSupply()).to.equal(total);
    expect(await token.balanceOf(creator.address)).to.equal(total);
    expect(await token.balanceOf(deployer.address)).to.equal(0n);
    expect(await token.owner()).to.equal(creator.address);
  });

  it("renounces ownership at deploy when asked", async function () {
    const { token } = await deploy({ renounce: true });
    expect(await token.owner()).to.equal(ZERO);
  });

  it("transfers and uses allowances", async function () {
    const { token, creator, other } = await deploy();
    await token.connect(creator).transfer(other.address, 100n);
    expect(await token.balanceOf(other.address)).to.equal(100n);
    await token.connect(other).approve(creator.address, 40n);
    await token.connect(creator).transferFrom(other.address, creator.address, 40n);
    expect(await token.balanceOf(other.address)).to.equal(60n);
  });

  it("only mints when mintable, and only for the owner", async function () {
    const plain = await deploy();
    await expect(plain.token.connect(plain.creator).mint(plain.creator.address, 1n)).to.be.revertedWith("Not mintable");
    const { token, creator, other } = await deploy({ mintable: true });
    await expect(token.connect(other).mint(other.address, 1n)).to.be.revertedWith("Not owner");
    await token.connect(creator).mint(other.address, 5n);
    expect(await token.balanceOf(other.address)).to.equal(5n);
  });

  it("only burns when burnable", async function () {
    const plain = await deploy();
    await expect(plain.token.connect(plain.creator).burn(1n)).to.be.revertedWith("Not burnable");
    const { token, creator } = await deploy({ burnable: true });
    const before = await token.totalSupply();
    await token.connect(creator).burn(10n);
    expect(await token.totalSupply()).to.equal(before - 10n);
  });

  it("pauses transfers when pausable", async function () {
    const { token, creator, other } = await deploy({ pausable: true });
    await token.connect(creator).pause();
    await expect(token.connect(creator).transfer(other.address, 1n)).to.be.revertedWith("Paused");
    await token.connect(creator).unpause();
    await token.connect(creator).transfer(other.address, 1n);
  });

  it("applies the max transaction limit to non-exempt wallets", async function () {
    const { token, creator, other, feeWallet } = await deploy({ maxTx: 100n });
    const limit = 100n * 10n ** 6n;
    await token.connect(creator).transfer(other.address, limit * 2n); // owner is exempt
    await expect(token.connect(other).transfer(feeWallet.address, limit + 1n)).to.be.revertedWith("Exceeds max tx");
    await token.connect(other).transfer(feeWallet.address, limit);
  });

  it("takes the transfer fee and rejects fees above 25%", async function () {
    const { token, creator, other, feeWallet, deployer } = await deploy({ feeBps: 200, feeRecipient: "fee" });
    await token.connect(creator).transfer(other.address, 10000n); // owner is exempt
    await token.connect(other).transfer(deployer.address, 1000n);
    expect(await token.balanceOf(feeWallet.address)).to.equal(20n);
    expect(await token.balanceOf(deployer.address)).to.equal(980n);
    await expect(deploy({ feeBps: 2501, feeRecipient: "fee" })).to.be.revertedWith("Fee too high");
  });
});
