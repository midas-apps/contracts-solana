import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import {
  DATA_FEED_PROGRAM_ID,
  DataFeedError,
} from "./constants/data-feed.constants";
import { DataFeedMode, fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createNewFeed,
  createNewManualFeed,
} from "./testers/data-feed.testers";
import { DEFAULT_PUBKEY } from "./constants/common.constants";

describe("data-feed", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { dataFeedProgram } = await dataFeedFixture();
      expect(dataFeedProgram.programId.equals(DATA_FEED_PROGRAM_ID)).toBe(true);
    });

    it("Should create default feed", async () => {
      const { dataFeedMTBill, dataFeedProgram, authority } =
        await dataFeedFixture();
      const feed = await fetchDataFeedState(
        dataFeedProgram,
        dataFeedMTBill.publicKey
      );

      expect(feed.authority.equals(authority.publicKey)).toBe(true);
      expect(feed.mode).toMatchObject(DataFeedMode.manual);
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
  });
});
