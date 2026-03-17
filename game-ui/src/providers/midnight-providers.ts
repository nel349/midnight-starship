import type { WalletClient } from 'midnight-wallet-connector';
import type { StarshipProviders, StarshipCircuitKeys } from '../../../api/src/common-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { Transaction } from '@midnight-ntwrk/midnight-js-types';
import type { FinalizedTransaction, TransactionId } from '@midnight-ntwrk/ledger-v7';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  PRIVATE_STATE_PASSWORD,
  PRIVATE_STATE_ACCOUNT_ID,
  DEFAULT_PROVER_URI,
} from '../config';

export async function createMidnightProviders(
  wallet: WalletClient,
): Promise<StarshipProviders> {
  const config = await wallet.getConfiguration();
  const walletState = await wallet.getShieldedAddresses();
  const zkConfigPath = window.location.origin;

  const zkConfigProvider = new FetchZkConfigProvider<StarshipCircuitKeys>(
    zkConfigPath,
    fetch.bind(window),
  );

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
      accountId: PRIVATE_STATE_ACCOUNT_ID,
    }),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      config.proverServerUri ?? DEFAULT_PROVER_URI,
      zkConfigProvider,
    ),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => walletState.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => walletState.shieldedEncryptionPublicKey,
      async balanceTx(tx, ttl?) {
        const hex = toHex(tx.serialize());
        const { tx: balancedHex } = await wallet.balanceUnsealedTransaction(hex);
        const bytes = fromHex(balancedHex);
        return Transaction.deserialize(
          'signature' as any,
          'proof' as any,
          'binding' as any,
          bytes,
        ) as unknown as FinalizedTransaction;
      },
    },
    midnightProvider: {
      async submitTx(tx): Promise<TransactionId> {
        const hex = toHex(tx.serialize());
        await wallet.submitTransaction(hex);
        return tx.identifiers()[0];
      },
    },
  };
}
