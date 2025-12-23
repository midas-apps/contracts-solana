import {
  ExtensionType,
  getExtensionTypes,
  getMetadataPointerState,
  getMint,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

import { createMTBillTokenMint } from '../common/create-mtoken-mint';

import { acFixture } from './fixture/ac.fixture';
import { processTransaction } from './helpers/common.helpers';

describe('m-tokens', () => {
  it('create mTBILL token mint', async () => {
    const fixture = await acFixture();

    const mTBillMint = await createMTBillTokenMint({
      payer: fixture.authority,
      authority: fixture.authority.publicKey,
      connection: fixture.provider.connection,
      sendTxFn: (_, tx, signers) => processTransaction(fixture.context, tx, signers),
    });

    const mint = await getMint(
      fixture.provider.connection,
      mTBillMint.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const metadataPointer = getMetadataPointerState(mint);
    const metadata = await getTokenMetadata(
      fixture.provider.connection,
      metadataPointer.metadataAddress,
      undefined,
    );
    const extensions = getExtensionTypes(mint.tlvData);

    expect(mint.decimals).toEqual(9);
    expect(mint.isInitialized).toEqual(true);
    expect(extensions).toContain(ExtensionType.PermanentDelegate);
    expect(extensions).toContain(ExtensionType.MetadataPointer);
    expect(metadata.name).toEqual('Midas US Treasury Bill Token');
    expect(metadata.symbol).toEqual('mTBILL');
    expect(metadata.uri).toEqual(
      'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/mtbill-metadata',
    );
  });
});
