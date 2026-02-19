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
            ]
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
            ]
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
            ]
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
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "decimals",
          "type": {
            "option": "u8"
          }
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
      "name": "manualFeedState",
      "docs": [
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
    }
  ]
};
