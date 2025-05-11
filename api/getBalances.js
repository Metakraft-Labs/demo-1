const { ethers } = require("ethers");

// Connect to the Soneium RPC endpoint
const RPC_URL = "https://rpc.soneium.org";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Smart contract addresses for different point types
const contractMap = {
  purchasedpoint: "0x155a0d960E76909905446118499Df6E0D0123122",
  claimedpoints: "0xeb9415D0B989B18231E6977819c24DEF47c855A8",
};

// Thresholds to determine if a user has completed a task
const completionThresholds = {
  purchasedpoint: 1000,
  claimedpoints: 7500,
};

// Minimal ABI to call balanceOf on ERC-20 contracts
const ABI = ["function balanceOf(address) view returns (uint256)"];

// Main API handler function
module.exports = async (req, res) => {
  const { address } = req.query;

// Validate the wallet address
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const rawBalances = {};  // Stores raw balances without transformation
  const data = {};         // Final formatted data to return
  let totalPoints = 0;     // Will hold the calculated total with multiplier

// Fetch balance from each contract
  for (const [key, contractAddress] of Object.entries(contractMap)) {
    try {
      const contract = new ethers.Contract(contractAddress, ABI, provider);
      const balanceBN = await contract.balanceOf(address); // Get raw balance (BigNumber)
      const balance = parseFloat(ethers.formatUnits(balanceBN, 18)); // Convert to decimal

      rawBalances[key] = balance; // Save for later multiplier math

      const threshold = completionThresholds[key];
      const completed = typeof threshold === "number" ? balance > threshold : null;

      data[key] = {
        balance,      // Original balance
        completed     // Completion status based on threshold
      };
    } catch (error) {
      data[key] = {
        balance: null,
        completed: false,
        error: error.message
      };
    }
  }

  // Apply multiplier
  const purchasedPoints = rawBalances.purchasedpoint || 0;
  const claimedPoints = rawBalances.claimedpoints || 0;

  const totalCalculatedPoints = (purchasedPoints * 3) + claimedPoints;

  // Override claimedpoints balance to show total
  if (data.claimedpoints) {
    data.claimedpoints.balance = parseFloat(totalCalculatedPoints.toFixed(2));
  }

  res.status(200).json({
    wallet: address,
    data,
    totalPoints: parseFloat(totalCalculatedPoints.toFixed(2))
  });
};
