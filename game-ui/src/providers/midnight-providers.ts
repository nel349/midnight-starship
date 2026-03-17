import type { WalletClient } from 'midnight-wallet-connector';
import type { StarshipProviders } from '../../../api/src/common-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {
  type BalancedTransaction,
  type UnbalancedTransaction,
  createBalancedTx,
} from '@midnight-ntwrk/midnight-js-types';
import { type CoinInfo, Transaction } from '@midnight-ntwrk/ledger-v8';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { StarshipCircuitKeys } from '../../../api/src/common-types';

export async function createMidnightProviders(
  wallet: WalletClient,
): Promise<StarshipProviders> {
  const config = await wallet.getConfiguration();
  const walletState = await wallet.getShieldedAddresses();
  const zkConfigPath = window.location.origin;

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'starship-private-state',
    }),
    zkConfigProvider: new FetchZkConfigProvider<StarshipCircuitKeys>(
      zkConfigPath,
      fetch.bind(window),
    ),
    proofProvider: httpClientProofProvider(config.proverServerUri ?? 'http://localhost:6300'),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      coinPublicKey: walletState.shieldedCoinPublicKey,
      encryptionPublicKey: walletState.shieldedEncryptionPublicKey,
      balanceTx(
        tx: UnbalancedTransaction,
        newCoins: CoinInfo[],
      ): Promise<BalancedTransaction> {
        return wallet
          .balanceUnsealedTransaction(
            Buffer.from(
              tx.serialize(getLedgerNetworkId()),
            ).toString('hex'),
          )
          .then(({ tx: balancedHex }) => {
            const bytes = Uint8Array.from(
              Buffer.from(balancedHex, 'hex'),
            );
            return Transaction.deserialize(bytes, getLedgerNetworkId());
          })
          .then(createBalancedTx);
      },
    },
    midnightProvider: {
      submitTx(tx: BalancedTransaction): Promise<string> {
        const hex = Buffer.from(
          tx.serialize(getLedgerNetworkId()),
        ).toString('hex');
        return wallet.submitTransaction(hex).then(() => {
          // Return the first transaction identifier
          return tx.identifiers()[0];
        });
      },
    },
  };
}
