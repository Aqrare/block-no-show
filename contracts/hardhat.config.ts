import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const accounts = [
  process.env.PRIVATE_KEY ||
    "",
];
const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      chainId: 11155111,
      url: "https://rpc.sepolia.org",
      accounts,
    },
    nero_testnet: {
      chainId: 6660001,
      url: "https://testnet.nerochain.io",
      accounts,
    },
    scroll: {
      chainId: 534352,
      url: `https://gateway-api.cabinet-node.com/${process.env.CABINET_TOKEN}`,
      accounts,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: {
      sepolia: process.env.ETHERSCAN_API || "",
    },
  },
};

export default config;
