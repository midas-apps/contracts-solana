
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getTokenAddresses } from '@/scripts/utils/addressQueries';
import { getMtoken, getNetwork } from '@/scripts/utils/argumentParser';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { getManualFeedStatePda } from '@/test/helpers/data-feed.helpers';
import { getDataFeedProgram } from '@/scripts/deploy/dataFeed';

async function main(
    provider: AnchorProvider,
    payer: Wallet,
    network: string
) {
    const common = { provider, payer, network };

    const mtoken = getMtoken();

    console.log(`Migrating minter vault to v2 for: ${mtoken}`);

    const manualFeed = getTokenAddresses(network, mtoken).mTokenUnderlyingFeed;
    const dataFeed = getTokenAddresses(network, mtoken).mTokenDataFeed;

    if (!manualFeed || !dataFeed) {
        throw createUserError(`Manual feed or base feed not found for ${mtoken} on ${network}`,);
    }

    if (!manualFeed.equals(getManualFeedStatePda(dataFeed))) {
        throw createUserError(`Underlying feed is not a manual feed`,);
    }

    const dataFeedProgram = getDataFeedProgram(provider);

    const tx =
        await dataFeedProgram.methods.migrateManualFeedToV2()
            .accountsPartial({
                manualFeed: manualFeed,
                payer: payer.publicKey,
                baseFeed: dataFeed,
            }).transaction();


    const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [], {
        action: 'deployer',
        comment: `Migrate mToken manual feed to v2 for ${mtoken}`,
        waitForTx: false,
        pollingIntervalMs: 1000,
        timeoutDurationMs: 120 * 1000,
    });

    console.log(result)

    if (result.signature) {
        console.log(`Transaction signature: ${result.signature}`);
    }
}

const network = getNetwork();

executeNetworkScript(
    network,
    (provider, payer, network) =>
        main(provider, payer as Wallet, network),
    'deployer'
);
