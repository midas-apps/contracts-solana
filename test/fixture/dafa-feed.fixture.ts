import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { ProgramTestContext } from 'solana-bankrun';

import { DataFeed } from 'target/types/data_feed';

import DATA_FEED_IDL from '../../target/idl/data_feed.json' with { type: 'json' };
import { AC_ROLES } from '../constants/ac.constants';
import { DATA_FEED_AC_ROLES } from '../constants/data-feed.constants';
import { acRoleToBuffer, getAccountAcRoleStatePda } from '../helpers/ac.helpers';
import { formatUnits, InitBankrunReturnType, parseUnits, processTransaction, toBN } from '../helpers/common.helpers';
import {
  DataFeedMode,
  generateFeedAcccount,
  getManualFeedStatePda,
} from '../helpers/data-feed.helpers';

import { acFixture } from './ac.fixture';

const initMockedFeeds = async (context: ProgramTestContext) => {
  // mainnet pyth SOL/USD account
  const pythHealhyFeed = [
    Keypair.generate(),
    Buffer.from(
      'IvEjY51+9M1gMUcENA3t3zcf1CRyFI8kjp0abRpesqw6zYt/1dayQwHvDYtv2izrpB2hXUCV0do5Kg0vjtDGx7wPTPrIwoC1bYBUWC0FAAAAzf1XAQAAAAD4////ZgB8ZwAAAABmAHxnAAAAAJyXUCEFAAAAKz4UAQAAAAB68JwSAAAAAAA=',
      'base64',
    ),
    1736179814,
  ] as const;

  // devnet switchboard mTBILL/USD account (5GjQDcVcPwwMAzT6ZUjXgeVgRVM4UTvbpYieiBKuQi7f)
  const switchboardHealhyFeed = [
    Keypair.generate(),
    Buffer.from(
      'xBtsxArX2ygmK0NkpmiHpd6mx4kFdZ7+VyymCgrkWReEb8F7BSisbvX0vhQAAAAAMPW+FAAAAAAApBRrwVYLDgAAAAAAAAAAkDfiD4Gn+CTbOnE8xYjATeEDBfMWFNY57v1LuujRnGZ+S58UAAAAAKRLnxQAAAAAAAjCKQPXBQ4AAAAAAAAAAOZ7GqcB2Y++LyL1s5nlJ5BPWiBqGufX9otlggY7+arp9fS+FAAAAAAw9b4UAAAAAACkFGvBVgsOAAAAAAAAAADcwmU2zXSlq73jYxbcgLN/aO6/MXT6F1VqWtFQFxvQOlEGoBQAAAAAmAagFAAAAAAA6IAhnlMHDgAAAAAAAAAAYJg3LYKk7K7VBmaP3CqKdDehOJ9w2BAdGN2ihbblBMLkr7sUAAAAABiwuxQAAAAAAOjZFyYKCw4AAAAAAAAAAAFePdj2XjIYFEVdoJ60zBPoenMylxr6RhH8xiH6PwRQmOK7FAAAAADA4rsUAAAAAACkFGvBVgsOAAAAAAAAAAAh+aXRmb92ZeGBkf0ZG8ojPe9v2Ok5BQ0UjroKgV/Ed0fkuxQAAAAAdOS7FAAAAAAApBRrwVYLDgAAAAAAAAAABefvazRs5weWwnESrUK5D0ipwe0qYLcnhkDOxbhNilYi2LsUAAAAAFjYuxQAAAAAAOjZFyYKCw4AAAAAAAAAAGjiSUNueeTftplz+u/z8VQ2hRIbsVfG2ikc8Oxa1OVTF9y7FAAAAACQ3LsUAAAAAACkFGvBVgsOAAAAAAAAAABQtwZpTNT6DaYcbKn3fERJYIW+SUeHf96zTfeNM0KsnUfkuxQAAAAAdOS7FAAAAAAApBRrwVYLDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/Ilyj6QdKQJmkzSdoeEIezEwWdPXIfvF5ASjm7Z11fyUd7+1/xAShZ8zbPmHJWgOdwW6Kr7OFxiM+yjKZspbC/Y2EK2Zr9LcruDwWDd0ot5QqFKkc6dU/XEAtanl47eLcdWGcAAAAAAAAAAAAAAAAA8gUqAQAAAAEAAABtVEJJTEwvVVNEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwGBAWRnAAAAAA0/nxQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApBRrwVYLDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACkFGvBVgsOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKQUa8FWCw4AAAAAAAAAAACkFGvBVgsOAAAAAAAAAAACAgAAAAAAAPX0vhQAAAAA9fS+FAAAAAD19L4UAAAAAJYAAAAAAAAAAAAAAAAAAAAAAAAAblaBP35LnxQAAAAAAAAAACRkgT9RBqAUAAAAAAAAAABjhoE/5K+7FAAAAAAAAAAAY4aBPyLYuxQAAAAAAAAAACaJgT8X3LsUAAAAAAAAAAAmiYE/mOK7FAAAAAAAAAAAJomBP0fkuxQAAAAAAAAAACaJgT/19L4UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      'base64',
    ),
    1734607233,
    348058928,
  ] as const;

  // Mock chainlink OCR2 USDC/USD feed with test price 0.99
  const chainlinkHealthyFeed = [
    Keypair.generate(),
    Buffer.from(
      "YLNFQoCBSXUCAZnJra7sYZIu5E6pd0qvi+y5Fd9sZVr/6Cm3RMr8b2YSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFVTREMgLyBVU0QgICAgICAgICAgICAgICAgICAgICAgCAAAAAABAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADNcA2kAAAAAwJ7mBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      "base64"
    ),
    1761827891,
  ] as const;

  for (const feed of [pythHealhyFeed, switchboardHealhyFeed]) {
    context.setAccount(feed[0].publicKey, {
      executable: false,
      owner: Keypair.generate().publicKey,
      lamports: 10000,
      data: feed[1],
    });
  }

  // set chainlink feed with correct owner program id
  context.setAccount(chainlinkHealthyFeed[0].publicKey, {
    executable: false,
    // Chainlink v2 SDK checks the owner is the Chainlink OCR2 program id,
    // so we must set the real program id here or parsing will fail.
    owner: new PublicKey("HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"),
    lamports: 10000,
    data: chainlinkHealthyFeed[1],
  });

  return {
    pyth: {
      account: pythHealhyFeed[0].publicKey,
      data: pythHealhyFeed[1],
      lastUpdatedAtTs: pythHealhyFeed[2],
      price: formatUnits(22235600000n, 8),
    },
    switchboard: {
      account: switchboardHealhyFeed[0].publicKey,
      data: switchboardHealhyFeed[1],
      lastUpdatedAtTs: switchboardHealhyFeed[2],
      lastUpdatedAtSlot: switchboardHealhyFeed[3],
      price: formatUnits(1011997930000000000n, 18),
    },
    chainlink: {
      account: chainlinkHealthyFeed[0].publicKey,
      data: chainlinkHealthyFeed[1],
      lastUpdatedAtTs: chainlinkHealthyFeed[2],
      price: formatUnits(99000000n, 8),
    },
  };
};

export const dataFeedFixture = async (fixture?: InitBankrunReturnType, initSlot?: bigint) => {
  const acF = await acFixture(fixture, initSlot);

  const {
    provider,
    context,
    accounts,
    authority,
    regularAccounts,
    acProgram,
    acRoleGlobal,
    acRoleMTbill,
  } = acF;

  const mockedFeeds = await initMockedFeeds(context);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataFeedProgram = new Program<DataFeed>(DATA_FEED_IDL as any, provider);

  const dataFeedPaymentToken = generateFeedAcccount();
  const dataFeedMTBill = generateFeedAcccount();

  const manualUnderlyingFeedPaymentToken = getManualFeedStatePda(dataFeedPaymentToken.publicKey);
  const manualUnderlyingFeedMTBill = getManualFeedStatePda(dataFeedMTBill.publicKey);

  // TODO: move to helpers
  const createManualFeed = async (
    feed: Keypair,
    acRole: PublicKey,
    {
      minPrice,
      maxPrice,
    }: {
      minPrice: bigint;
      maxPrice: bigint;
    },
  ) => {
    const createFeedTx = new Transaction().add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
        .accountsPartial({
          account: authority.publicKey,
          acRole: acRole,
          authority: authority.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(
            acRole,
            authority.publicKey,
            AC_ROLES.ADMIN,
          ),
          accountAcRole: getAccountAcRoleStatePda(
            acRole,
            authority.publicKey,
            DATA_FEED_AC_ROLES.FEED_ADMIN,
          ),
        })
        .instruction(),
      await dataFeedProgram.methods
        .newFeed(
          acRole,
          getManualFeedStatePda(feed.publicKey),
          DataFeedMode.manual,
          toBN(minPrice),
          toBN(maxPrice),
          3600,
        )
        .accounts({
          feed: feed.publicKey,
          payer: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .newManualFeed(toBN(parseUnits('1')), 9, toBN(parseUnits('1', 2)))
        .accountsPartial({
          baseFeed: feed.publicKey,
          authority: authority.publicKey,
          acRole: acRole,
          authorityAcRole: getAccountAcRoleStatePda(
            acRole,
            authority.publicKey,
            DATA_FEED_AC_ROLES.FEED_ADMIN,
          ),
        })
        .instruction(),
    );

    await processTransaction(context, createFeedTx, [authority, feed]);
  };

  await createManualFeed(dataFeedMTBill, acRoleMTbill.publicKey, {
    minPrice: parseUnits('0.1'),
    maxPrice: parseUnits('10'),
  });

  await createManualFeed(dataFeedPaymentToken, acRoleGlobal.publicKey, {
    minPrice: parseUnits('0.997'),
    maxPrice: parseUnits('1.05'),
  });

  return {
    ...acF,
    provider,
    accounts,
    dataFeedProgram,
    dataFeedMTBill,
    dataFeedPaymentToken,
    manualUnderlyingFeedPaymentToken,
    manualUnderlyingFeedMTBill,
    authority,
    regularAccounts,
    context,
    mockedFeeds,
    createManualFeed,
  };
};

export type DataFeedFixtureReturnType = Awaited<ReturnType<typeof dataFeedFixture>>;
