import { ethers } from 'ethers';

export async function recordHash(dataHash: string): Promise<{ txHash: string; blockRef: string }> {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY!, provider);

  const tx = {
    to: process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
    data: dataHash,
    value: 0,
  };

  const txResponse = await wallet.sendTransaction(tx);
  const receipt = await txResponse.wait();

  return {
    txHash: txResponse.hash,
    blockRef: receipt?.blockNumber?.toString() || '0',
  };
}

export function generateHash(data: Record<string, unknown>): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
}

export async function verifyHash(data: Record<string, unknown>, txHash: string): Promise<boolean> {
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const tx = await provider.getTransaction(txHash);
  if (!tx) return false;
  const expectedHash = generateHash(data);
  return tx.data === expectedHash;
}
