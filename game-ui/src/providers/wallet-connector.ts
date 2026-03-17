import { createWalletClient, type WalletClient } from 'midnight-wallet-connector';
import { WALLET_URL, NETWORK_ID } from '../config';
import { showToast } from '../ui/toast';

let client: WalletClient | null = null;

export async function connectWallet(
  url: string = WALLET_URL,
  networkId: string = NETWORK_ID,
): Promise<WalletClient> {
  if (client) return client;

  client = await createWalletClient({
    url,
    networkId,
    onApprovalPending: (method) => showToast(`Awaiting approval: ${method}`, 'info'),
    onApprovalResolved: (method, result) =>
      showToast(`${method}: ${result}`, result === 'approved' ? 'success' : 'error'),
  });

  client.onDisconnect(() => {
    client = null;
    showToast('Wallet disconnected', 'error');
  });

  return client;
}

export function getWalletClient(): WalletClient | null {
  return client;
}

export function disconnectWallet(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
