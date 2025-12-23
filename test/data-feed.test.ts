import { CommonError, DEFAULT_PUBKEY } from './constants/common.constants';
import { DATA_FEED_PROGRAM_ID, DataFeedError } from './constants/data-feed.constants';
import { dataFeedFixture } from './fixture/dafa-feed.fixture';
import { vaultsFixture } from './fixture/vaults.fixture';
import { parseUnits, setClockTime } from './helpers/common.helpers';
import { updatePaymentToken } from './testers/common-vaults.testers';
import {
  createDefaultDataFeed,
  createNewFeed,
  createNewManualFeed,
  updateFeed,
  updateManualFeed,
} from './testers/data-feed.testers';
import { mintInstant, prepareCommonMintTest } from './testers/minter-vault.testers';

describe('data-feed', () => {
  describe('initializing', () => {
    it('Should deploy program', async () => {
      const { dataFeedProgram } = await dataFeedFixture();
      expect(dataFeedProgram.programId.equals(DATA_FEED_PROGRAM_ID)).toBe(true);
    });
  });

  describe('new_feed', () => {
    it('create new feed with default parameters', async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(fixture, {});
    });

    it('should fail: when min price is > max price', async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          maxPrice: 1n,
          minPrice: 2n,
        },
        {
          revertedWith: DataFeedError.InvalidMinPrice,
        },
      );
    });

    it('should fail: when max price is 0', async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          maxPrice: 0n,
        },
        {
          revertedWith: DataFeedError.InvalidMaxPrice,
        },
      );
    });

    it('should fail: when min price is 0', async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          minPrice: 0n,
        },
        {
          revertedWith: DataFeedError.InvalidMinPrice,
        },
      );
    });

    it('should fail: when max_staleness is 0', async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          maxStaleness: 0,
        },
        {
          revertedWith: DataFeedError.InvalidStaleness,
        },
      );
    });

    it('should fail: when underlying feed is default pubkey', async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          underlyingFeed: DEFAULT_PUBKEY,
        },
        {
          revertedWith: DataFeedError.InvalidUnderlyingFeed,
        },
      );
    });
  });

  describe('new_manual_feed', () => {
    it('create new manual feed with default parameters', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createNewFeed(fixture, {});

      await createNewManualFeed(fixture, {
        baseFeed: feed.publicKey,
      });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createNewFeed(fixture, {});

      await createNewManualFeed(
        fixture,
        {
          baseFeed: feed.publicKey,
        },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('update_feed', () => {
    it('update max staleness', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        maxStaleness: 1,
      });
    });

    it('update min price', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        minPrice: 1n,
      });
    });

    it('update max price', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        maxPrice: parseUnits('100'),
      });
    });

    it('update ac_role', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        acRole: fixture.acRoleMTbill.publicKey,
      });
    });

    it('update authority and call update mode', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        acRole: fixture.acRoleMTbill.publicKey,
      });

      await updateFeed(fixture, {
        feed,
        mode: 'switchboard',
      });
    });

    it('update underlying feed', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        underlyingFeed: fixture.regularAccounts[0].publicKey,
      });
    });

    it('update mode', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        mode: 'manual',
      });
    });

    it('should fail: update from non-authority', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(
        fixture,
        {
          feed,
          mode: 'switchboard',
        },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: update underlying feed to default pubkey', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(
        fixture,
        {
          feed,
          underlyingFeed: DEFAULT_PUBKEY,
        },
        { revertedWith: DataFeedError.InvalidUnderlyingFeed },
      );
    });

    it('should fail: update max_staleness when value is 0 and mode is manual', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(
        fixture,
        {
          feed,
          maxStaleness: 0,
        },
        { revertedWith: DataFeedError.InvalidStaleness },
      );
    });

    it('should fail: update max_staleness when value is 0 and mode is manual', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(
        fixture,
        {
          feed,
          maxStaleness: 1 + 365 * 86400,
        },
        { revertedWith: DataFeedError.ExceedsMaxStaleness },
      );
    });

    it('should fail: update max_staleness when value is 0 and mode is pyth', async () => {
      const fixture = await dataFeedFixture();

      await updateFeed(
        fixture,
        {
          mode: 'pyth',
          underlyingFeed: fixture.mockedFeeds.pyth.account,
          maxStaleness: 1 + 5 * 60,
        },
        { revertedWith: DataFeedError.ExceedsMaxStaleness },
      );
    });

    it('should fail: update max_staleness when value is 0 and mode is switchboard', async () => {
      const fixture = await dataFeedFixture();

      await updateFeed(
        fixture,
        {
          mode: 'switchboard',
          underlyingFeed: fixture.mockedFeeds.switchboard.account,
          maxStaleness: 1 + 216000,
        },
        { revertedWith: DataFeedError.ExceedsMaxStaleness },
      );
    });
  });

  describe('update_manual_feed', () => {
    it('update price', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(fixture, {
        baseFeed,
        price: parseUnits('1'),
      });
    });

    it('update decimals', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(fixture, {
        baseFeed,
        decimals: 2,
      });
    });

    it('should fail: update from non-authority', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(
        fixture,
        {
          baseFeed,
        },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('PYTH underlying ', () => {
    it('when underlying PYTH feed is valid', async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: 'pyth',
        underlyingFeed: fixture.mockedFeeds.pyth.account,
        maxPrice: parseUnits(fixture.mockedFeeds.pyth.price.toString()),
      });

      await updateFeed(fixture, {
        mode: 'pyth',
        underlyingFeed: fixture.mockedFeeds.pyth.account,
        maxPrice: parseUnits(fixture.mockedFeeds.pyth.price.toString()),
        maxStaleness: 5 * 60,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await setClockTime(fixture.context, BigInt(fixture.mockedFeeds.pyth.lastUpdatedAtTs));

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('0.044523197'),
        },
      );
    });

    it('should fail: when underlying PYTH feed is stale', async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: 'pyth',
        underlyingFeed: fixture.mockedFeeds.pyth.account,
        maxPrice: parseUnits(fixture.mockedFeeds.pyth.price.toString()),
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('0.044523197'),
        },
        {
          revertedWith: CommonError.GenericError,
        },
      );
    });

    it('should fail: when price is > max price', async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: 'pyth',
        underlyingFeed: fixture.mockedFeeds.pyth.account,
        maxPrice: parseUnits(fixture.mockedFeeds.pyth.price.toString()) - 1n,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await setClockTime(fixture.context, BigInt(fixture.mockedFeeds.pyth.lastUpdatedAtTs));

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('0.044523197'),
        },
        {
          revertedWith: CommonError.GenericError,
        },
      );
    });

    it('should fail: when price is < min price', async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: 'pyth',
        underlyingFeed: fixture.mockedFeeds.pyth.account,
        maxPrice: parseUnits(fixture.mockedFeeds.pyth.price.toString()) + 2n,
        minPrice: parseUnits(fixture.mockedFeeds.pyth.price.toString()) + 1n,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await setClockTime(fixture.context, BigInt(fixture.mockedFeeds.pyth.lastUpdatedAtTs));

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('0.044523197'),
        },
        {
          revertedWith: CommonError.GenericError,
        },
      );
    });
  });

  describe('Switchboard underlying ', () => {
    const feedUpdatedAtSlot = 348058928n;

    it('when underlying Switchboard feed is valid', async () => {
      const fixture = await vaultsFixture(feedUpdatedAtSlot);

      const feed = await createNewFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()),
        maxStaleness: 216000, // max allowed staleness for switchboard feed,
      });

      await updateFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()),
        maxStaleness: 216000, // max allowed staleness for switchboard feed,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('9.782628705'),
        },
      );
    });

    it('should fail: when underlying Switchboard feed is stale', async () => {
      const fixture = await vaultsFixture(feedUpdatedAtSlot + 150n);

      const feed = await createNewFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()),
      });

      await updateFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()),
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('9.782628705'),
        },
        {
          revertedWith: CommonError.GenericError,
        },
      );
    });

    it('should fail: when price is > max price', async () => {
      const fixture = await vaultsFixture(feedUpdatedAtSlot);

      const feed = await createNewFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()) - 1n,
      });

      await updateFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()),
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('9.782628705'),
        },
        {
          revertedWith: CommonError.GenericError,
        },
      );
    });

    it('should fail: when price is < min price', async () => {
      const fixture = await vaultsFixture(feedUpdatedAtSlot);

      const feed = await createNewFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()) + 2n,
        minPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()) + 1n,
      });

      await updateFeed(fixture, {
        mode: 'switchboard',
        underlyingFeed: fixture.mockedFeeds.switchboard.account,
        maxPrice: parseUnits(fixture.mockedFeeds.switchboard.price.toString()),
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits('9.782628705'),
        },
        {
          revertedWith: CommonError.GenericError,
        },
      );
    });
  });
});
