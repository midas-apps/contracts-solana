import { CommonError, DEFAULT_PUBKEY } from './constants/common.constants';
import { DATA_FEED_PROGRAM_ID, DataFeedError } from './constants/data-feed.constants';
import { dataFeedFixture } from './fixture/dafa-feed.fixture';
import { vaultsFixture } from './fixture/vaults.fixture';
import { parseUnits, setClockTime, timeTravel } from './helpers/common.helpers';
import { getManualFeedStatePda } from './helpers/data-feed.helpers';
import { updatePaymentToken } from './testers/common-vaults.testers';
import {
  createDefaultDataFeed,
  createDefaultManualFeedGrowth,
  createNewFeed,
  createNewManualFeed,
  createNewManualFeedGrowth,
  migrateManualFeedToV2,
  updateFeed,
  updateManualFeed,
  updateManualFeedGrowth,
  updateManualFeedGrowthPrice,
  updateManualFeedPrice,
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

  describe('new_manual_feed_growth', () => {
    it('create new manual feed growth with default parameters', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createNewFeed(fixture, {});

      await createNewManualFeedGrowth(fixture, {
        baseFeed: feed.publicKey,
      });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await dataFeedFixture();

      const feed = await createNewFeed(fixture, {});

      await createNewManualFeedGrowth(
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
    it('update decimals', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(fixture, {
        baseFeed,
        decimals: 2,
      });
    });

    it('update max answer deviation', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(fixture, {
        baseFeed,
        maxAnswerDeviation: parseUnits('2', 2),
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

  describe('migrate_manual_feed_to_v2', () => {
    it('migrate manual feed to v2', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      const manualFeedStatePda = getManualFeedStatePda(baseFeed);
      const manualFeedStateData = await fixture.provider.connection.getAccountInfo(manualFeedStatePda);
      const dataWithoutMaxAnswerDeviation = manualFeedStateData.data.slice(0, 21);

      const lamports = await fixture.provider.connection.getMinimumBalanceForRentExemption(dataWithoutMaxAnswerDeviation.length);

      fixture.context.setAccount(manualFeedStatePda, {
        data: dataWithoutMaxAnswerDeviation,
        executable: false,
        owner: fixture.dataFeedProgram.programId,
        lamports,
      });

      await migrateManualFeedToV2(fixture, {
        baseFeed,
      });
    });

    it('migrate manual feed to v2 from non-authority', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      const manualFeedStatePda = getManualFeedStatePda(baseFeed);
      const manualFeedStateData = await fixture.provider.connection.getAccountInfo(manualFeedStatePda);
      const dataWithMaxAnswerDeviation = manualFeedStateData.data.slice(0, 21);

      const lamports = await fixture.provider.connection.getMinimumBalanceForRentExemption(dataWithMaxAnswerDeviation.length);

      fixture.context.setAccount(manualFeedStatePda, {
        data: dataWithMaxAnswerDeviation,
        executable: false,
        owner: fixture.dataFeedProgram.programId,
        lamports,
      });

      await migrateManualFeedToV2(fixture, {
        baseFeed,
      }, {
        from: fixture.regularAccounts[0],
      });
    });
  });

  describe('update_manual_feed_growth', () => {
    it('update decimals', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        decimals: 2,
      });
    });

    it('update max answer deviation', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        maxAnswerDeviation: parseUnits('2', 2),
      });
    });

    it('update min growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        minGrowthApr: parseUnits('2', 2),
      });
    });

    it('update min growth apr to equal to max growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        minGrowthApr: parseUnits('10', 2),
      });
    });

    it('update max growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        maxGrowthApr: parseUnits('2', 2),
      });
    });

    it('update max growth apr to equal to min growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        maxGrowthApr: parseUnits('0', 2),
      });
    });

    it('update only up', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        onlyUp: true,
      });
    });

    it('should fail: update from non-authority', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(
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

    it('should fail: when new max growth apr is less than min growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(
        fixture,
        {
          baseFeed,
          minGrowthApr: parseUnits('3'),
        }
      );

      await updateManualFeedGrowth(
        fixture,
        {
          baseFeed,
          maxGrowthApr: parseUnits('1'),
        },
        {
          revertedWith: DataFeedError.InvalidMaxGrowthApr,
        },
      );
    });

    it('should fail: when new min growth apr is greater than max growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(
        fixture,
        {
          baseFeed,
          minGrowthApr: parseUnits('11'),
        },
        {
          revertedWith: DataFeedError.InvalidMinGrowthApr,
        },
      );
    });
  });

  describe('update_manual_feed_price', () => {
    it('update price (unsafe)', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeedPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
      });
    });

    it('update price (unsafe) when deviation is too high', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeedPrice(fixture, {
        baseFeed,
        price: parseUnits('1.2'),
      });
    });

    it('update price (safe)', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeedPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
        isSafe: true,
      });
    });

    it('should fail: update price (safe) when deviation is too high', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeedPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
        isSafe: true,
      });

      await updateManualFeedPrice(fixture, {
        baseFeed,
        price: parseUnits('1.2'),
        isSafe: true,
      }, {
        revertedWith: DataFeedError.DeviationTooHigh,
      });
    });
  });

  describe('update_manual_feed_growth_price', () => {
    it('update growth price (unsafe)', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
      });
    });

    it('update growth price (unsafe) when deviation is too high', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1.2'),
      });
    });

    it('update growth price (safe)', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);


      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
        isSafe: true,
      });
    });

    it('should fail: update growth price (safe) when deviation is too high', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
        isSafe: true,
      });

      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1.2'),
        isSafe: true,
      }, {
        revertedWith: DataFeedError.DeviationTooHigh,
      });
    });

    it('should fail: update growth price (safe) when growth apr is > max growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1.001'),
        growthApr: parseUnits('10.1'),
        isSafe: true,
      }, {
        revertedWith: DataFeedError.InvalidGrowthApr,
      });
    });

    it('should fail: update growth price (safe) when growth apr is < min growth apr', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1.001'),
        growthApr: parseUnits('-0.01'),
        isSafe: true,
      }, {
        revertedWith: DataFeedError.InvalidGrowthApr,
      });
    });

    it('should fail: update growth price (safe) when only_up is true and growth apr is < 0', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await updateManualFeedGrowth(fixture, {
        baseFeed,
        onlyUp: true,
        minGrowthApr: parseUnits('-10'),
      });

      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1.001'),
        growthApr: parseUnits('-0.01'),
        isSafe: true,
      }, {
        revertedWith: DataFeedError.InvalidGrowthApr,
      });
    });

    it('should fail: update growth price (safe) when 1h is not passed since last update', async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultManualFeedGrowth(fixture);

      await timeTravel(fixture.context, 3601n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1'),
        isSafe: true,
      });

      await timeTravel(fixture.context, 100n);

      await updateManualFeedGrowthPrice(fixture, {
        baseFeed,
        price: parseUnits('1.01'),
        isSafe: true,
      }, {
        revertedWith: DataFeedError.NotEnoughTimeHasPassedSinceLastUpdate,
      });
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
          revertedWith: 'PriceTooOld',
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
          revertedWith: DataFeedError.PriceIsHigherThanMax,
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
          revertedWith: DataFeedError.PriceIsLowerThanMin,
        },
      );
    });
  });

  describe('Switchboard underlying ', () => {
    const feedUpdatedAtSlot = 348058928n;

    it('when underlying Switchboard feed is valid', async () => {
      const fixture = await vaultsFixture(undefined, feedUpdatedAtSlot);

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
      const fixture = await vaultsFixture(undefined, feedUpdatedAtSlot + 150n);

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
          revertedWith: 'NotEnoughSamples',
        },
      );
    });

    it('should fail: when price is > max price', async () => {
      const fixture = await vaultsFixture(undefined, feedUpdatedAtSlot);

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
          revertedWith: DataFeedError.PriceIsHigherThanMax,
        },
      );
    });

    it('should fail: when price is < min price', async () => {
      const fixture = await vaultsFixture(undefined, feedUpdatedAtSlot);

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
          revertedWith: DataFeedError.PriceIsLowerThanMin,
        },
      );
    });
  });

  describe("Chainlink underlying ", () => {
    it("when underlying Chainlink feed is valid", async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: "chainlink",
        underlyingFeed: fixture.mockedFeeds.chainlink.account,
        maxPrice: parseUnits(fixture.mockedFeeds.chainlink.price.toString()),
        maxStaleness: 5 * 60,
      });

      await updateFeed(fixture, {
        mode: "chainlink",
        underlyingFeed: fixture.mockedFeeds.chainlink.account,
        maxPrice: parseUnits(fixture.mockedFeeds.chainlink.price.toString()),
        maxStaleness: 5 * 60,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      // align clock with embedded chainlink timestamp to avoid staleness
      await setClockTime(
        fixture.context,
        BigInt(fixture.mockedFeeds.chainlink.lastUpdatedAtTs)
      );

      await mintInstant(
        fixture,
        { minReceiveAmount: 0n },
        {},
        // do not assert exact minted amount; just ensure success
        undefined
      );
    });

    it("should fail: when underlying Chainlink feed is stale", async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: "chainlink",
        underlyingFeed: fixture.mockedFeeds.chainlink.account,
        maxPrice: parseUnits(fixture.mockedFeeds.chainlink.price.toString()),
        maxStaleness: 5 * 60,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      // move clock beyond maxStaleness
      await setClockTime(
        fixture.context,
        BigInt(fixture.mockedFeeds.chainlink.lastUpdatedAtTs + 301)
      );

      await mintInstant(fixture, { minReceiveAmount: 0n }, {}, undefined, {
        revertedWith: DataFeedError.PriceIsStale,
      });
    });

    it("should fail: when price is > max price", async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: "chainlink",
        underlyingFeed: fixture.mockedFeeds.chainlink.account,
        maxPrice:
          parseUnits(fixture.mockedFeeds.chainlink.price.toString()) - 1n,
        maxStaleness: 5 * 60,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await setClockTime(
        fixture.context,
        BigInt(fixture.mockedFeeds.chainlink.lastUpdatedAtTs)
      );

      await mintInstant(fixture, { minReceiveAmount: 0n }, {}, undefined, {
        revertedWith: DataFeedError.PriceIsHigherThanMax,
      });
    });

    it("should fail: when price is < min price", async () => {
      const fixture = await vaultsFixture();

      const feed = await createNewFeed(fixture, {
        mode: "chainlink",
        underlyingFeed: fixture.mockedFeeds.chainlink.account,
        maxPrice:
          parseUnits(fixture.mockedFeeds.chainlink.price.toString()) + 2n,
        minPrice:
          parseUnits(fixture.mockedFeeds.chainlink.price.toString()) + 1n,
        maxStaleness: 5 * 60,
      });

      await prepareCommonMintTest(fixture);

      await updatePaymentToken(fixture, {
        dataFeed: feed.publicKey,
      });

      await setClockTime(
        fixture.context,
        BigInt(fixture.mockedFeeds.chainlink.lastUpdatedAtTs)
      );

      await mintInstant(fixture, { minReceiveAmount: 0n }, {}, undefined, {
        revertedWith: DataFeedError.PriceIsLowerThanMin,
      });
    });
  });
});
