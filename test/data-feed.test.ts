import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import { DATA_FEED_PROGRAM_ID } from "./constants/data-feed.constants";
import { fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createNewFeed,
  createNewManualFeed,
} from "./testers/data-feed.testers";

describe("data-feed", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { dataFeedProgram } = await dataFeedFixture();
      expect(dataFeedProgram.programId.equals(DATA_FEED_PROGRAM_ID)).toBe(true);
    });

    it("Should create default feed", async () => {
      const { dataFeed, dataFeedProgram, authority } = await dataFeedFixture();
      const feed = await fetchDataFeedState(
        dataFeedProgram,
        dataFeed.publicKey
      );

      expect(feed.authority.equals(authority.publicKey)).toBe(true);
      expect(feed.manualModeEnabled).toBe(false);
      expect(feed.targetDecimals).toBe(9);
    });
  });

  describe("new_feed", () => {
    it("create new feed with default parameters", async () => {
      const fixture = await dataFeedFixture();

      await createNewFeed(fixture, {});
    });
  });

  describe("new_manual_feed", () => {
    it("create new manual feed with default parameters", async () => {
      const fixture = await dataFeedFixture();

      await createNewManualFeed(fixture, {});
    });
  });
});
