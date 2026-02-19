import { PublicKey } from '@solana/web3.js';

import ACCESS_CONTROL_IDL from '../target/idl/access_control.json' with { type: 'json' };
import VAULTS_IDL from '../target/idl/midas_vaults.json' with { type: 'json' };
import TOKEN_AUTHORITY_IDL from '../target/idl/token_authority.json' with { type: 'json' };
import DATA_FEED_IDL from '../target/idl/data_feed.json' with { type: 'json' };

export const programAddresses = {
    access_control: new PublicKey(ACCESS_CONTROL_IDL.address),
    midas_vaults: new PublicKey(VAULTS_IDL.address),
    token_authority: new PublicKey(TOKEN_AUTHORITY_IDL.address),
    data_feed: new PublicKey(DATA_FEED_IDL.address),
};
