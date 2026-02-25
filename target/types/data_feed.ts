/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/data_feed.json`.
 */
export type DataFeed = {
  "address": "MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s",
  "metadata": {
    "name": "dataFeed",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "migrateManualFeedToV2",
      "discriminator": [
        87,
        111,
        161,
        248,
        245,
        251,
        10,
        149
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Payer for realloc (lamports for extra space)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "baseFeed",
          "docs": [
            "Base feed state account"
          ]
        },
        {
          "name": "manualFeed",
          "docs": [
            "Manual feed state account - use UncheckedAccount to bypass deserialization"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "newFeed",
      "discriminator": [
        177,
        52,
        189,
        152,
        201,
        87,
        187,
        248
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Payer and signer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "feed",
          "docs": [
            "New `FeedState` instance"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "acRole",
          "type": "pubkey"
        },
        {
          "name": "underlyingFeed",
          "type": "pubkey"
        },
        {
          "name": "mode",
          "type": {
            "defined": {
              "name": "feedMode"
            }
          }
        },
        {
          "name": "minPrice",
          "type": "u64"
        },
        {
          "name": "maxPrice",
          "type": "u64"
        },
        {
          "name": "maxStaleness",
          "type": "u32"
        }
      ]
    },
    {
      "name": "newManualFeed",
      "discriminator": [
        153,
        122,
        135,
        208,
        24,
        205,
        89,
        52
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "manualFeed",
          "docs": [
            "New `ManualFeedState` instance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in base_feed"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "baseFeed",
          "docs": [
            "`DataFeed` account"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "initialPrice",
          "type": "u64"
        },
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "maxAnswerDeviation",
          "type": "u64"
        }
      ]
    },
    {
      "name": "newManualFeedGrowth",
      "discriminator": [
        17,
        246,
        7,
        196,
        252,
        225,
        141,
        3
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "manualFeedGrowth",
          "docs": [
            "New `ManualFeedGrowthState` instance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  103,
                  114,
                  111,
                  119,
                  116,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in base_feed"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "baseFeed",
          "docs": [
            "`DataFeed` account"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "initialPrice",
          "type": "u64"
        },
        {
          "name": "initialPriceTimestamp",
          "type": "u32"
        },
        {
          "name": "initialGrowthApr",
          "type": "i64"
        },
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "maxAnswerDeviation",
          "type": "u64"
        },
        {
          "name": "minGrowthApr",
          "type": "i64"
        },
        {
          "name": "maxGrowthApr",
          "type": "i64"
        },
        {
          "name": "onlyUp",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateFeed",
      "discriminator": [
        222,
        6,
        52,
        131,
        173,
        81,
        113,
        247
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in `feed`"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "feed",
          "docs": [
            "`DataFeed` account to update"
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "acRole",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "underlyingFeed",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "mode",
          "type": {
            "option": {
              "defined": {
                "name": "feedMode"
              }
            }
          }
        },
        {
          "name": "minPrice",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "maxPrice",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "maxStaleness",
          "type": {
            "option": "u32"
          }
        }
      ]
    },
    {
      "name": "updateManualFeed",
      "discriminator": [
        42,
        63,
        110,
        35,
        20,
        132,
        12,
        230
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "manualFeed",
          "docs": [
            "`ManualFeedState` instance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in base_feed"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "baseFeed",
          "docs": [
            "`DataFeed` account"
          ]
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "maxAnswerDeviation",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "updateManualFeedGrowth",
      "discriminator": [
        11,
        204,
        213,
        30,
        197,
        55,
        136,
        178
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "manualFeedGrowth",
          "docs": [
            "`ManualFeedGrowthState` instance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  103,
                  114,
                  111,
                  119,
                  116,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in base_feed"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "baseFeed",
          "docs": [
            "`DataFeed` account"
          ]
        }
      ],
      "args": [
        {
          "name": "decimals",
          "type": {
            "option": "u8"
          }
        },
        {
          "name": "maxAnswerDeviation",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "minGrowthApr",
          "type": {
            "option": "i64"
          }
        },
        {
          "name": "maxGrowthApr",
          "type": {
            "option": "i64"
          }
        },
        {
          "name": "onlyUp",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updateManualFeedGrowthPrice",
      "discriminator": [
        168,
        247,
        180,
        21,
        130,
        81,
        37,
        54
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "manualFeedGrowth",
          "docs": [
            "`ManualFeedGrowthState` instance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  103,
                  114,
                  111,
                  119,
                  116,
                  104,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in base_feed"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "baseFeed",
          "docs": [
            "`DataFeed` account"
          ]
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "priceTimestamp",
          "type": "u32"
        },
        {
          "name": "growthApr",
          "type": "i64"
        },
        {
          "name": "isSafe",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateManualFeedPrice",
      "discriminator": [
        218,
        240,
        154,
        7,
        63,
        198,
        254,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with Feed Admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "manualFeed",
          "docs": [
            "`ManualFeedState` instance"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  110,
                  117,
                  97,
                  108,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "baseFeed"
              }
            ]
          }
        },
        {
          "name": "acRole",
          "docs": [
            "AccessControlRoles instance that is set in base_feed"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Feed Admin AC role of `authority`"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  97,
                  99,
                  95,
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "acRole"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  95,
                  102,
                  101,
                  101,
                  100,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                42,
                1,
                206,
                20,
                109,
                129,
                76,
                211,
                127,
                66,
                241,
                232,
                145,
                191,
                17,
                48,
                56,
                122,
                134,
                121,
                111,
                238,
                95,
                162,
                111,
                247,
                120,
                137,
                239,
                43,
                6
              ]
            }
          }
        },
        {
          "name": "baseFeed",
          "docs": [
            "`DataFeed` account"
          ]
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "isSafe",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "accessControlRoleState",
      "discriminator": [
        91,
        24,
        64,
        231,
        44,
        138,
        91,
        20
      ]
    },
    {
      "name": "accountAccessControlRoleState",
      "discriminator": [
        100,
        17,
        104,
        157,
        227,
        195,
        225,
        30
      ]
    },
    {
      "name": "feedState",
      "discriminator": [
        171,
        251,
        171,
        20,
        196,
        179,
        72,
        207
      ]
    },
    {
      "name": "manualFeedGrowthState",
      "discriminator": [
        24,
        102,
        213,
        97,
        119,
        223,
        229,
        212
      ]
    },
    {
      "name": "manualFeedState",
      "discriminator": [
        85,
        188,
        133,
        61,
        170,
        132,
        192,
        135
      ]
    }
  ],
  "events": [
    {
      "name": "feedUpdatedEvent",
      "discriminator": [
        218,
        52,
        227,
        244,
        93,
        110,
        85,
        61
      ]
    },
    {
      "name": "manualFeedGrowthUpdatedEvent",
      "discriminator": [
        144,
        203,
        147,
        173,
        2,
        6,
        83,
        15
      ]
    },
    {
      "name": "manualFeedUpdatedEvent",
      "discriminator": [
        101,
        228,
        124,
        183,
        119,
        43,
        97,
        38
      ]
    },
    {
      "name": "manualFeedUpdatedEventV2",
      "discriminator": [
        238,
        164,
        209,
        41,
        190,
        168,
        29,
        36
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidUnderlyingFeedProvided",
      "msg": "Invalid underlying feed provided"
    },
    {
      "code": 6001,
      "name": "notAuthority",
      "msg": "Not an authority"
    },
    {
      "code": 6002,
      "name": "priceIsStale",
      "msg": "Data feed price is stale"
    },
    {
      "code": 6003,
      "name": "invalidStaleness",
      "msg": "Invalid staleness value"
    },
    {
      "code": 6004,
      "name": "exceedsMaxStaleness",
      "msg": "Staleness value exceeds max allowed staleness"
    },
    {
      "code": 6005,
      "name": "invalidMinPrice",
      "msg": "Invalid min price value"
    },
    {
      "code": 6006,
      "name": "invalidMaxPrice",
      "msg": "Invalid max price value"
    },
    {
      "code": 6007,
      "name": "invalidUnderlyingFeed",
      "msg": "Invalid underlying feed"
    },
    {
      "code": 6008,
      "name": "priceIsLowerThanMin",
      "msg": "Price is lower than min."
    },
    {
      "code": 6009,
      "name": "priceIsHigherThanMax",
      "msg": "Price is higher than max."
    },
    {
      "code": 6010,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow or underflow"
    },
    {
      "code": 6011,
      "name": "deviationTooHigh",
      "msg": "Deviation is too high"
    },
    {
      "code": 6012,
      "name": "invalidMaxGrowthApr",
      "msg": "Invalid max growth apr value"
    },
    {
      "code": 6013,
      "name": "invalidMinGrowthApr",
      "msg": "Invalid min growth apr value"
    },
    {
      "code": 6014,
      "name": "invalidGrowthApr",
      "msg": "Invalid growth apr value"
    },
    {
      "code": 6015,
      "name": "invalidPriceTimestamp",
      "msg": "Invalid price timestamp"
    },
    {
      "code": 6016,
      "name": "invalidTimestamp",
      "msg": "Invalid timestamp"
    },
    {
      "code": 6017,
      "name": "notEnoughTimeHasPassedSinceLastUpdate",
      "msg": "Not enough time has passed since last update"
    }
  ],
  "types": [
    {
      "name": "accessControlRoleState",
      "docs": [
        "State layout for Access Control Role base account",
        "As accounts that holds it are not a PDA",
        "We declare a layout struct so anchor will generate a discriminator",
        "Accounts that will hold roles will be PDAs that are using this",
        "account as one of the keys",
        "For different mProducts different AccessControlRole accounts will be used",
        "To make products more decoupled from each other"
      ],
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "accountAccessControlRoleState",
      "docs": [
        "State account for Account Access Control Role",
        "If account is initialized - then user has a specific role",
        "If its not initialized - no role assigned"
      ],
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "feedMode",
      "docs": [
        "Describes types of supported underlying feeds"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "manual"
          },
          {
            "name": "switchboard"
          },
          {
            "name": "pyth"
          },
          {
            "name": "chainlink"
          },
          {
            "name": "manualGrowth"
          }
        ]
      }
    },
    {
      "name": "feedState",
      "docs": [
        "Account that represents DataFeed instance and",
        "holds data related to it. Data can be updated",
        "by the actors with sufficient access (has `FEED_ADMIN` role)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "acRole",
            "docs": [
              "AccessControlRole instance that is gonna be used to control access",
              "to management instructions of data-feed program"
            ],
            "type": "pubkey"
          },
          {
            "name": "underlyingFeed",
            "docs": [
              "Account that holds the price"
            ],
            "type": "pubkey"
          },
          {
            "name": "mode",
            "docs": [
              "Underlying feed type"
            ],
            "type": {
              "defined": {
                "name": "feedMode"
              }
            }
          },
          {
            "name": "minPrice",
            "docs": [
              "Min price that feed can return"
            ],
            "type": "u64"
          },
          {
            "name": "maxPrice",
            "docs": [
              "Max price that feed can return"
            ],
            "type": "u64"
          },
          {
            "name": "maxStaleness",
            "docs": [
              "Max. seconds between last price update and current timestamp."
            ],
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "feedUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feed",
            "docs": [
              "`FeedState` account"
            ],
            "type": "pubkey"
          },
          {
            "name": "acRole",
            "docs": [
              "AccessControlRole account"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "underlyingFeed",
            "docs": [
              "New underlying feed address"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "mode",
            "docs": [
              "New feed mode"
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "feedMode"
                }
              }
            }
          },
          {
            "name": "minPrice",
            "docs": [
              "New min price"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxPrice",
            "docs": [
              "New max price"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxStaleness",
            "docs": [
              "New max staleness"
            ],
            "type": {
              "option": "u32"
            }
          }
        ]
      }
    },
    {
      "name": "manualFeedGrowthState",
      "docs": [
        "Account that holds data of manual data feed growth",
        "where the answer can be controlled by the",
        "actors with sufficient access (has `FEED_ADMIN` role)",
        "and growth apr % is applied to the answer"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "docs": [
              "Current price"
            ],
            "type": "u64"
          },
          {
            "name": "decimals",
            "docs": [
              "Current price decimals"
            ],
            "type": "u8"
          },
          {
            "name": "priceTimestamp",
            "docs": [
              "Price timestamp that was passed in the last price update"
            ],
            "type": "u32"
          },
          {
            "name": "lastUpdatedAt",
            "docs": [
              "Last time when price was updated timestamp"
            ],
            "type": "u32"
          },
          {
            "name": "maxAnswerDeviation",
            "docs": [
              "Max answer deviation"
            ],
            "type": "u64"
          },
          {
            "name": "growthApr",
            "type": "i64"
          },
          {
            "name": "minGrowthApr",
            "docs": [
              "Min growth apr %"
            ],
            "type": "i64"
          },
          {
            "name": "maxGrowthApr",
            "docs": [
              "Max growth apr %"
            ],
            "type": "i64"
          },
          {
            "name": "onlyUp",
            "docs": [
              "If true - new price can only be > than the current price"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "manualFeedGrowthUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseFeed",
            "docs": [
              "`FeedState` account"
            ],
            "type": "pubkey"
          },
          {
            "name": "manualFeedGrowth",
            "docs": [
              "Manual feed account"
            ],
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "docs": [
              "New Decimals"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "price",
            "docs": [
              "New price"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "priceTimestamp",
            "docs": [
              "New price timestamp"
            ],
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "maxAnswerDeviation",
            "docs": [
              "New max answer deviation"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "growthApr",
            "docs": [
              "New growth apr %"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "minGrowthApr",
            "docs": [
              "New min growth apr %"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "maxGrowthApr",
            "docs": [
              "New max growth apr %"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "onlyUp",
            "docs": [
              "New only up"
            ],
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "manualFeedState",
      "docs": [
        "Current version - V2",
        "- Added max_answer_deviation field",
        "",
        "Account that holds data of manual data feed",
        "where the answer can be controlled by the",
        "actors with sufficient access (has `FEED_ADMIN` role)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "docs": [
              "Current price"
            ],
            "type": "u64"
          },
          {
            "name": "decimals",
            "docs": [
              "Current price decimals"
            ],
            "type": "u8"
          },
          {
            "name": "lastUpdatedAt",
            "docs": [
              "Last time when price was updated timestamp"
            ],
            "type": "u32"
          },
          {
            "name": "maxAnswerDeviation",
            "docs": [
              "Max answer deviation"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "manualFeedUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseFeed",
            "docs": [
              "`FeedState` account"
            ],
            "type": "pubkey"
          },
          {
            "name": "manualFeed",
            "docs": [
              "Manual feed account"
            ],
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "docs": [
              "New Decimals"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "price",
            "docs": [
              "New price"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "manualFeedUpdatedEventV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseFeed",
            "docs": [
              "`FeedState` account"
            ],
            "type": "pubkey"
          },
          {
            "name": "manualFeed",
            "docs": [
              "Manual feed account"
            ],
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "docs": [
              "New Decimals"
            ],
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "price",
            "docs": [
              "New price"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "maxAnswerDeviation",
            "docs": [
              "New max answer deviation"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    }
  ]
};
