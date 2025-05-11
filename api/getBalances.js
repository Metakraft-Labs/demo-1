const { ethers } = require("ethers");

const RPC_URL = "https://rpc.soneium.org";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const contractMap = {
  purchasedpoint: "0x155a0d960E76909905446118499Df6E0D0123122",
  claimedpoints: "0xeb9415D0B989B18231E6977819c24DEF47c855A8",
};

const completionThresholds = {
  purchasedpoint: 1000,
  claimedpoints: 7500,
};

const ABI = ["function balanceOf(address) view returns (uint256)"];

module.exports = async (req, res) => {
  const { address } = req.query;

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const rawBalances = {};   // store raw individual balances
  const data = {};
  let totalPoints = 0;

  // Step 1: Fetch each balance
  for (const [key, contractAddress] of Object.entries(contractMap)) {
    try {
      const contract = new ethers.Contract(contractAddress, ABI, provider);
      const balanceBN = await contract.balanceOf(address);
      const balance = parseFloat(ethers.formatUnits(balanceBN, 18));

      rawBalances[key] = balance;

      const threshold = completionThresholds[key];
      const completed = typeof threshold === "number" ? balance > threshold : null;

      data[key] = {
        balance,
        completed
      };

      totalPoints += balance;
    } catch (error) {
      data[key] = {
        balance: null,
        completed: false,
        error: error.message
      };
    }
  }

  // Step 2: Replace claimedpoints balance with totalPoints
  if (data.claimedpoints) {
    data.claimedpoints.balance = parseFloat(totalPoints.toFixed(2));
  }

  res.status(200).json({
    wallet: address,
    data,
    totalPoints: parseFloat(totalPoints.toFixed(2))
  });
};
