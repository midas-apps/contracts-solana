import { executeAnchorScript } from "@/common/utils";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  AnchorUtils,
  PullFeed,
  CrossbarClient,
  OracleJob,
  getDefaultQueue,
  getDefaultDevnetQueue,
  asV0Tx,
} from "@switchboard-xyz/on-demand";

const main = async (provider: AnchorProvider, payer: Keypair) => {
  const jobs: OracleJob[] = [
    OracleJob.create({
      tasks: [
        {
          cacheTask: {
            cacheItems: [
              {
                variableName: "VALUE_HEX",
                job: {
                  tasks: [
                    {
                      httpTask: {
                        url: "https://eth.drpc.org",
                        body: JSON.stringify({
                          jsonrpc: "2.0",
                          method: "eth_call",
                          params: [
                            {
                              from: "0xfCEE9754E8C375e145303b7cE7BEca3201734A2B",
                              to: "0xfCEE9754E8C375e145303b7cE7BEca3201734A2B",
                              data: "0x63692905",
                            },
                          ],
                          id: 1,
                        }),
                        headers: [
                          {
                            key: "Content-Type",
                            value: "application/json",
                          },
                        ],
                        method: 2,
                      },
                    },
                    {
                      jsonParseTask: {
                        path: "$.result",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          valueTask: {
            hex: "${VALUE_HEX}",
          },
        },
        {
          divideTask: {
            big: "1000000000_000000000",
          },
        },
      ],
    }),
  ];

  console.log("Running simulation...\n");

  // Print the jobs that are being run.
  const jobJson = JSON.stringify({ jobs: jobs.map((job) => job.toJSON()) });
  console.log(jobJson);
  console.log();

  // Serialize the jobs to base64 strings.
  const serializedJobs = jobs.map((oracleJob) => {
    const encoded = OracleJob.encodeDelimited(oracleJob).finish();
    const base64 = Buffer.from(encoded).toString("base64");
    return base64;
  });

  // Call the simulation server.
  const response = await fetch("https://api.switchboard.xyz/api/simulate", {
    method: "POST",
    headers: [["Content-Type", "application/json"]],
    body: JSON.stringify({ cluster: "Devnet", jobs: serializedJobs }),
  });

  // Check response.
  if (response.ok) {
    const data = await response.json();
    console.log(`Response is good (${response.status})`);
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`Response is bad (${response.status})`);
    throw await response.text();
  }

  console.log("Storing and creating the feed...\n");

  // Get the queue for the network you're deploying on
  let queue = await getDefaultDevnetQueue(); // or `getDefaultDevnetQueue()` for devnet,

  // Get the crossbar server client
  const crossbarClient = CrossbarClient.default();

  // Get the payer keypair

  console.log("Using Payer:", payer.publicKey.toBase58(), "\n");

  // Upload jobs to Crossbar, which pins valid feeds on ipfs
  const { feedHash } = await crossbarClient.store(
    queue.pubkey.toBase58(),
    jobs
  );
  const [pullFeed, feedKeypair] = PullFeed.generate(queue.program);

  const ix = await pullFeed.initIx({
    name: "mTBILL/USD", // the feed name (max 32 bytes)
    queue: queue.pubkey, // the queue of oracles to bind to
    maxVariance: 5.0, // the maximum variance allowed for the feed results
    minResponses: 3, // minimum number of responses of jobs to allow
    feedHash: Buffer.from(feedHash.slice(2), "hex"), // the feed hash
    minSampleSize: 2, // The minimum number of samples required for setting feed value
    maxStaleness: 150, // The maximum number of slots that can pass before a feed value is considered stale.
    payer: payer.publicKey, // the payer of the feed
  });

  const tx = new Transaction().add(ix);

  // // simulate the transaction
  // const simulateResult = await provider.connection.simulateTransaction(tx, [
  //   payer,
  // ]);

  // console.log(simulateResult);

  const sig = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [payer, feedKeypair],
    {
      commitment: "finalized",
      skipPreflight: true,
    }
  );

  console.log(`Feed ${feedKeypair.publicKey} initialized: ${sig}`);
};

executeAnchorScript(main);
