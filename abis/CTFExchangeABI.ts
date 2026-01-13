
export const CTF_EXCHANGE_ABI = [
  "function fillOrders(tuple(bytes32 salt, address maker, address signer, address taker, uint256 tokenId, uint256 makerAmount, uint256 takerAmount, uint256 expiration, uint256 nonce, uint256 feeRate, uint8 side, uint8 signatureType, bytes signature)[] orders, uint256[] makerFillAmounts, uint256[] takerFillAmounts) external",
  "function matchOrders(tuple(bytes32 salt, address maker, address signer, address taker, uint256 tokenId, uint256 makerAmount, uint256 takerAmount, uint256 expiration, uint256 nonce, uint256 feeRate, uint8 side, uint8 signatureType, bytes signature)[] orders, uint256[] makerFillAmounts, uint256[] takerFillAmounts) external",
  "event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerFillAmount, uint256 takerFillAmount, uint256 fee)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];
