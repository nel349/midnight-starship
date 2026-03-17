/**
 * Test configuration for the Starship contract.
 *
 * Implements the ContractConfiguration interface from testkit-js,
 * pointing to the compiled contract's ZK artifacts.
 */

import type { ContractConfiguration } from '@midnight-ntwrk/testkit-js';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export class StarshipConfiguration implements ContractConfiguration {
  readonly privateStateStoreName: string;
  readonly zkConfigPath: string;

  constructor(privateStateStoreName?: string, zkConfigPath?: string) {
    this.privateStateStoreName = privateStateStoreName ?? `starship-test-${Date.now()}`;
    this.zkConfigPath = zkConfigPath ?? path.resolve(currentDir, '..', '..', 'contract', 'dist', 'managed', 'starship');
  }
}
