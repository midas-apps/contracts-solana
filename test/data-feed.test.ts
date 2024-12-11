import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import {
  DATA_FEED_PROGRAM_ID,
  DataFeedError,
} from "./constants/data-feed.constants";
import { DataFeedMode, fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createDefaultDataFeed,
  createNewFeed,
  createNewManualFeed,
  updateFeed,
  updateManualFeed,
} from "./testers/data-feed.testers";
import { CommonError, DEFAULT_PUBKEY } from "./constants/common.constants";
import { parseUnits } from "./helpers/common.helpers";

describe("data-feed", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { dataFeedProgram } = await dataFeedFixture();
      expect(dataFeedProgram.programId.equals(DATA_FEED_PROGRAM_ID)).toBe(true);
    });
  });

  describe("new_feed", () => {
    it("create new feed with default parameters", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(fixture, {});
    });

    it("should fail: when min price is > max price", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          maxPrice: 1n,
          minPrice: 2n,
        },
        {
          revertedWith: DataFeedError.InvalidMinPrice,
        }
      );
    });

    it("should fail: when max price is 0", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          maxPrice: 0n,
        },
        {
          revertedWith: DataFeedError.InvalidMaxPrice,
        }
      );
    });

    it("should fail: when min price is 0", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          minPrice: 0n,
        },
        {
          revertedWith: DataFeedError.InvalidMinPrice,
        }
      );
    });

    it("should fail: when max_staleness is 0", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          maxStaleness: 0,
        },
        {
          revertedWith: DataFeedError.InvalidStaleness,
        }
      );
    });

    it("should fail: when underlying feed is default pubkey", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(
        fixture,
        {
          underlyingFeed: DEFAULT_PUBKEY,
        },
        {
          revertedWith: DataFeedError.InvalidUnderlyingFeed,
        }
      );
    });
  });

  describe("new_manual_feed", () => {
    it("create new manual feed with default parameters", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createNewFeed(fixture, {});

      await createNewManualFeed(fixture, {
        baseFeed: feed.publicKey,
      });
    });

    it("should fail: call from non-authority", async () => {
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
        }
      );
    });
  });

  describe("update_feed", () => {
    it("update max staleness", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        maxStaleness: 1,
      });
    });

    it("update min price", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        minPrice: 1n,
      });
    });

    it("update max price", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        maxPrice: parseUnits("100"),
      });
    });

    it("update ac_role", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        acRole: fixture.acRoleMTbill.publicKey,
      });
    });

    it("update authority and call update mode", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        acRole: fixture.acRoleMTbill.publicKey,
      });

      await updateFeed(fixture, {
        feed,
        mode: "switchboard",
      });
    });

    it("update underlying feed", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        underlyingFeed: fixture.regularAccounts[0].publicKey,
      });
    });

    it("update mode", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(fixture, {
        feed,
        mode: "manual",
      });
    });

    it("should fail: update from non-authority", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(
        fixture,
        {
          feed,
          mode: "switchboard",
        },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: update underlying feed to default pubkey", async () => {
      const fixture = await dataFeedFixture();

      const feed = await createDefaultDataFeed(fixture);

      await updateFeed(
        fixture,
        {
          feed,
          underlyingFeed: DEFAULT_PUBKEY,
        },
        { revertedWith: DataFeedError.InvalidUnderlyingFeed }
      );
    });
  });

  describe("update_manual_feed", () => {
    it("update price", async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(fixture, {
        baseFeed,
        price: parseUnits("1"),
      });
    });

    it("update decimals", async () => {
      const fixture = await dataFeedFixture();

      const baseFeed = await createDefaultDataFeed(fixture);

      await updateManualFeed(fixture, {
        baseFeed,
        decimals: 2,
      });
    });

    it("should fail: update from non-authority", async () => {
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
        }
      );
    });
  });
});
