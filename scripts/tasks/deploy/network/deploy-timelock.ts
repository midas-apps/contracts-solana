import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTimelockAddress } from '@/scripts/utils/addressQueries';
import { registerGlobalTimelock } from '@/scripts/utils/addressRegistry';
import { saveAddressesToFile } from '@/scripts/utils/addressStorage';
import { getNetwork } from '@/scripts/utils/argumentParser';
import { loadNetworkConfig } from '@/scripts/configs/loadNetworkConfig';
import { deployTimelock, DeployTimelockConfig } from '@/scripts/deploy/timelock';
import { PublicKey } from '@solana/web3.js';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
    console.log(`Deploying Timelock for: ${network}`);

    const networkConfig = loadNetworkConfig(network);

    console.log('networkConfig', networkConfig);
    if (!networkConfig?.timelock) {
        throw createUserError(`Timelock config not found for network ${network}`,);
    }

    const existingTimelock = getTimelockAddress(network);
    if (existingTimelock) {
        console.log('✓ Timelock already deployed');
        console.log(`Timelock: ${existingTimelock.toString()}`);
        return;
    }

    const common = { provider, payer, network };

    const timelockConfig: DeployTimelockConfig = {
        delay: networkConfig.timelock.delay,
        member: new PublicKey(networkConfig.timelock.member),
    };

    const timelock = await deployTimelock(common, timelockConfig);

    registerGlobalTimelock(network, timelock);
    await saveAddressesToFile();

    console.log('\n✅ Timelock deployment submitted');
    console.log(`Timelock: ${timelock.toString()}`);
    return;
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
