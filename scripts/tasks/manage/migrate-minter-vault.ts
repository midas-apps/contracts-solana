import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { fetchMinterVaultState, fetchVaultCommonState } from '@/test/helpers/vaults.helpers';

import { getVaultsProgram } from '../../deploy/vaults';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Migrating minter vault for ${mtoken} on ${network}`);

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.minter?.commonVault) {
    throw createUserError(`Minter vault not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:minter-vault --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const vaultsProgram = getVaultsProgram(provider);
  const commonVault = tokenAddrs.minter.commonVault;

  const commonState = await fetchVaultCommonState(vaultsProgram, commonVault);
  const minterState = await fetchMinterVaultState(vaultsProgram, tokenAddrs.minter.account);

  console.log(`Current minter vault state:`);
  console.log(`  - commonVault: ${minterState.commonVault.toString()}`);
  console.log(`  - mintAuthorityPda: ${minterState.mintAuthorityPda.toString()}`);
  console.log(`  - firstDepositMinMTokens: ${minterState.firstDepositMinMTokens.toString()}`);

  const tx = new Transaction().add(
    await vaultsProgram.methods
      .migrateMinterVault()
      .accountsPartial({
        authority: payer.publicKey,
        vaultCommon: commonVault,
        minterVault: tokenAddrs.minter.account,
        authorityAcRole: getAccountAcRoleStatePda(
          commonState.acRole,
          payer.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN,
        ),
      })
      .instruction(),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    mToken: mtoken,
  });

  console.log(`✅ Minter vault migrated successfully!`);
  console.log(`Transaction: ${result.signature}`);

  // Fetch updated state
  const updatedState = await fetchMinterVaultState(vaultsProgram, tokenAddrs.minter.account);
  console.log(`Updated max_supply_cap: ${updatedState.maxSupplyCap.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
