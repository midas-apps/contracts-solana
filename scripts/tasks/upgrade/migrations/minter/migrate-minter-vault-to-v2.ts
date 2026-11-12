import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { getVaultsProgram } from '@/scripts/deploy/vaults';
import { getTokenAddresses } from '@/scripts/utils/addressQueries';
import { getMtoken, getNetwork } from '@/scripts/utils/argumentParser';
import { AC_ROLES } from '@/test/constants/ac.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { fetchVaultCommonState } from '@/test/helpers/vaults.helpers';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const common = { provider, payer, network };

  const mtoken = getMtoken();

  console.log(`Migrating minter vault to v2 for: ${mtoken}`);

  const minterVault = getTokenAddresses(network, mtoken).minter;

  if (!minterVault) {
    throw createUserError(`Minter vault not found for ${mtoken} on ${network}`);
  }

  const vaultsProgram = getVaultsProgram(provider);
  const vaultCommonState = await fetchVaultCommonState(vaultsProgram, minterVault.commonVault);

  const tx = await vaultsProgram.methods
    .migrateMinterVaultStateToV2()
    .accountsPartial({
      minterVault: minterVault.account,
      authority: payer.publicKey,
      vaultCommon: minterVault.commonVault,
      authorityAcRole: getAccountAcRoleStatePda(
        vaultCommonState.acRole,
        payer.publicKey,
        AC_ROLES.ADMIN,
      ),
    })
    .transaction();

  const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
    action: 'deployer',
    comment: `Migrate minter vault to v2 for ${mtoken}`,
    waitForTx: false,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  console.log(result);

  if (result.signature) {
    console.log(`Transaction signature: ${result.signature}`);
  }
}

const network = getNetwork();

executeNetworkScript(
  network,
  (provider, payer, network) => main(provider, payer as Wallet, network),
  'deployer',
);
