/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/midas_vaults.json`.
 */
export type MidasVaults = {
  "address": "MidasZepq8k2oFNCCm1rm31rbbj68JSPJeXwqQu6NfZ",
  "metadata": {
    "name": "midasVaults",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addPaymentToken",
      "discriminator": [
        19,
        203,
        48,
        148,
        80,
        1,
        179,
        140
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "paymentMint",
          "docs": [
            "Payment mint SPL account"
          ]
        },
        {
          "name": "dataFeed",
          "docs": [
            "Data feed account that will be set for the payment mint"
          ]
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "dataFeedProgram",
          "docs": [
            "Data feed program"
          ],
          "address": "MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s"
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": "u64"
        },
        {
          "name": "allowance",
          "type": "u128"
        },
        {
          "name": "stable",
          "type": "bool"
        }
      ]
    },
    {
      "name": "addPaymentTokenFiat",
      "discriminator": [
        16,
        71,
        120,
        9,
        170,
        68,
        119,
        172
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": "u64"
        },
        {
          "name": "allowance",
          "type": "u128"
        }
      ]
    },
    {
      "name": "approveMintRequest",
      "discriminator": [
        118,
        25,
        122,
        172,
        236,
        89,
        39,
        76
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "vaultMinterRole",
          "docs": [
            "Vault minter role"
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
                "path": "token_authority.ac_role",
                "account": "tokenAuthorityState"
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "mintRequest",
          "docs": [
            "Mint vault request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority state account (token-authority program)"
          ],
          "writable": true
        },
        {
          "name": "mMintUserAta",
          "docs": [
            "mMint ATA of `user_account`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userAccount"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "SPL mint account"
          ],
          "writable": true
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "SPL token program for mMint"
          ]
        },
        {
          "name": "tokenAuthorityProgram",
          "docs": [
            "Token authority program"
          ],
          "address": "MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "newOutRate",
          "type": "u64"
        },
        {
          "name": "isSafe",
          "type": "bool"
        },
        {
          "name": "skipOnSupplyCapExceeded",
          "type": "bool"
        }
      ]
    },
    {
      "name": "approveRedeemRequest",
      "discriminator": [
        217,
        85,
        114,
        22,
        245,
        206,
        2,
        20
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "requestRedeemer",
          "docs": [
            "request redeemer account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "paymentMintUserAta",
          "docs": [
            "Payment mint user ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userAccount"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMint",
          "docs": [
            "Payment mint SPL account"
          ],
          "writable": true
        },
        {
          "name": "paymentMintRedeemerAta",
          "docs": [
            "payment mint redeemer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "requestRedeemer"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintVaultAta",
          "docs": [
            "mMint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint SPL account"
          ],
          "writable": true
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "Payment mint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "newMTokenRate",
          "type": "u64"
        },
        {
          "name": "isSafe",
          "type": "bool"
        },
        {
          "name": "safeValidateLiquidity",
          "type": "bool"
        }
      ]
    },
    {
      "name": "approveRedeemRequestFiat",
      "discriminator": [
        6,
        19,
        117,
        215,
        48,
        243,
        140,
        205
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "mMintVaultAta",
          "docs": [
            "mMint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint SPL account"
          ],
          "writable": true
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "newMTokenRate",
          "type": "u64"
        },
        {
          "name": "isSafe",
          "type": "bool"
        }
      ]
    },
    {
      "name": "migrateMinterVaultStateToV2",
      "discriminator": [
        100,
        91,
        125,
        36,
        123,
        115,
        119,
        94
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
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "minterVault",
          "docs": [
            "Minter vault state account - use UncheckedAccount to bypass deserialization"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
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
      "name": "mintInstant",
      "discriminator": [
        6,
        87,
        1,
        20,
        244,
        161,
        133,
        82
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommonSigner",
          "docs": [
            "Vault common account of user"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority state account"
          ],
          "writable": true
        },
        {
          "name": "vaultMinterRole",
          "docs": [
            "Vault minter role"
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
                "path": "token_authority.ac_role",
                "account": "tokenAuthorityState"
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "ac",
          "docs": [
            "AccessControlState account"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "AccountAccessControlState account"
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
                  99
                ]
              },
              {
                "kind": "account",
                "path": "ac"
              },
              {
                "kind": "account",
                "path": "signer"
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
          "name": "paymentMint",
          "docs": [
            "Payment mint account"
          ]
        },
        {
          "name": "paymentMintTokensReceiverAta",
          "docs": [
            "Payment mint ATA of `tokens_receiver`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.tokens_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintFeeReceiverAta",
          "docs": [
            "Payment mint ATA of `fee_receiver`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.fee_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintSignerAta",
          "docs": [
            "Payment mint ATA of `signer`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintSignerAta",
          "docs": [
            "mMint ATA of `signer`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint account"
          ],
          "writable": true
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint Data Feed account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed account"
          ]
        },
        {
          "name": "paymentMintDataFeed",
          "docs": [
            "Payment Mint Data Feed account"
          ]
        },
        {
          "name": "paymentMintFeed",
          "docs": [
            "payment mint underlying feed account"
          ]
        },
        {
          "name": "pauseInxState",
          "docs": [
            "Pause state of instruction"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "Payment mint token program"
          ]
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "tokenAuthorityProgram",
          "docs": [
            "Token authority program"
          ],
          "address": "MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountToken",
          "type": "u64"
        },
        {
          "name": "minReceiveAmount",
          "type": "u64"
        },
        {
          "name": "referrerId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "mintRequest",
      "discriminator": [
        191,
        136,
        46,
        36,
        221,
        147,
        50,
        193
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommonSigner",
          "docs": [
            "Vault common account of user"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "mintRequest",
          "docs": [
            "Mint request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "account",
                "path": "vault_common.requests_count",
                "account": "vaultCommonState"
              }
            ]
          }
        },
        {
          "name": "ac",
          "docs": [
            "AccessControlState account"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "Account access control state account"
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
                  99
                ]
              },
              {
                "kind": "account",
                "path": "ac"
              },
              {
                "kind": "account",
                "path": "signer"
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
          "name": "paymentMint",
          "docs": [
            "Payment mint account"
          ]
        },
        {
          "name": "paymentMintTokensReceiverAta",
          "docs": [
            "Payment mint ATA of `tokens_receiver`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.tokens_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintFeeReceiverAta",
          "docs": [
            "Payment mint ATA of `fee_receiver`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.fee_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintSignerAta",
          "docs": [
            "Payment mint ATA of `signer`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint data feed state account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed account"
          ]
        },
        {
          "name": "paymentMintDataFeed",
          "docs": [
            "Payment mint data feed state account"
          ]
        },
        {
          "name": "paymentMintFeed",
          "docs": [
            "Payment mint underlying feed account"
          ]
        },
        {
          "name": "pauseInxState",
          "docs": [
            "Instruction pause state account"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  1
                ]
              }
            ]
          }
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "payment mint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "system program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountToken",
          "type": "u64"
        },
        {
          "name": "referrerId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "newCommonVault",
      "discriminator": [
        247,
        150,
        19,
        193,
        67,
        13,
        213,
        95
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Signer and Payer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "New vault common account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "ac",
          "type": "pubkey"
        },
        {
          "name": "mMint",
          "type": "pubkey"
        },
        {
          "name": "mMintFeed",
          "type": "pubkey"
        },
        {
          "name": "greenlistEnforced",
          "type": "bool"
        },
        {
          "name": "acRole",
          "type": "pubkey"
        },
        {
          "name": "tokensReceiver",
          "type": "pubkey"
        },
        {
          "name": "feeReceiver",
          "type": "pubkey"
        },
        {
          "name": "instantFee",
          "type": "u64"
        },
        {
          "name": "instantDailyLimit",
          "type": "u128"
        },
        {
          "name": "variationTolerance",
          "type": "u64"
        },
        {
          "name": "minAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "newCommonVaultAccount",
      "discriminator": [
        79,
        138,
        20,
        182,
        243,
        211,
        186,
        157
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Signer and Payer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "account",
          "docs": [
            "User account"
          ]
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "vaultCommonAccount",
          "docs": [
            "New vault common account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "account"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "newMinterVault",
      "discriminator": [
        2,
        110,
        83,
        41,
        144,
        103,
        178,
        249
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority state account"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "token_authority.base_seed",
                "account": "tokenAuthorityState"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                5,
                61,
                48,
                160,
                122,
                241,
                21,
                115,
                108,
                5,
                107,
                96,
                87,
                117,
                59,
                91,
                117,
                244,
                155,
                30,
                34,
                125,
                252,
                96,
                96,
                188,
                157,
                94,
                123,
                89,
                13,
                253
              ]
            }
          }
        },
        {
          "name": "tokenAuthorityProgram",
          "docs": [
            "Token authority program"
          ],
          "address": "MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "firstDepositMinMTokens",
          "type": "u64"
        },
        {
          "name": "maxSupplyCap",
          "type": "u64"
        }
      ]
    },
    {
      "name": "newPauseInx",
      "discriminator": [
        237,
        102,
        168,
        76,
        188,
        17,
        56,
        113
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault pauser role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Pauser role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  112,
                  97,
                  117,
                  115,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "pauseInxState",
          "docs": [
            "Pause index state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "arg",
                "path": "fnId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fnId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "newRedeemerVault",
      "discriminator": [
        76,
        3,
        32,
        78,
        227,
        238,
        0,
        191
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestRedeemer",
          "type": "pubkey"
        },
        {
          "name": "minFiatRedeemAmount",
          "type": "u64"
        },
        {
          "name": "fiatFlatFee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemInstant",
      "discriminator": [
        126,
        63,
        6,
        139,
        213,
        60,
        16,
        157
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "user account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommonSigner",
          "docs": [
            "user vault common account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "ac",
          "docs": [
            "AccessControlState account"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "Account access control state account"
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
                  99
                ]
              },
              {
                "kind": "account",
                "path": "ac"
              },
              {
                "kind": "account",
                "path": "signer"
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
          "name": "paymentMint",
          "docs": [
            "Payment mint state account"
          ]
        },
        {
          "name": "mMintFeeReceiverAta",
          "docs": [
            "mMint fee receiver ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.fee_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintVaultAta",
          "docs": [
            "Payment mint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintSignerAta",
          "docs": [
            "Payment mint signer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintSignerAta",
          "docs": [
            "mMint signer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint account"
          ],
          "writable": true
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint data feed state account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed account"
          ]
        },
        {
          "name": "paymentMintDataFeed",
          "docs": [
            "Payment Mint Data Feed account"
          ]
        },
        {
          "name": "paymentMintFeed",
          "docs": [
            "payment mint underlying feed account"
          ]
        },
        {
          "name": "pauseInxState",
          "docs": [
            "Instruction pause state"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  2
                ]
              }
            ]
          }
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "payment mint token program"
          ]
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "system program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountMToken",
          "type": "u64"
        },
        {
          "name": "minReceiveAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemRequest",
      "discriminator": [
        237,
        30,
        113,
        222,
        127,
        230,
        203,
        243
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommonSigner",
          "docs": [
            "Vault common account of user"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "vault_common.requests_count",
                "account": "vaultCommonState"
              }
            ]
          }
        },
        {
          "name": "ac",
          "docs": [
            "AccessControlState account"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "Account access control state account"
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
                  99
                ]
              },
              {
                "kind": "account",
                "path": "ac"
              },
              {
                "kind": "account",
                "path": "signer"
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
          "name": "paymentMint",
          "docs": [
            "Payment mint account"
          ]
        },
        {
          "name": "mMintVaultAta",
          "docs": [
            "mMint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintFeeReceiverAta",
          "docs": [
            "mMint fee receiver ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.fee_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintSignerAta",
          "docs": [
            "mMint signer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint SPL account"
          ],
          "writable": true
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint data feed state account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed state account"
          ]
        },
        {
          "name": "paymentMintDataFeed",
          "docs": [
            "Payment mint data feed state account"
          ]
        },
        {
          "name": "paymentMintFeed",
          "docs": [
            "Payment mint underlying feed state account"
          ]
        },
        {
          "name": "pauseInxState",
          "docs": [
            "Instruction pause state account"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  3
                ]
              }
            ]
          }
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "Payment mint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountMToken",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemRequestFiat",
      "discriminator": [
        54,
        116,
        93,
        20,
        217,
        142,
        131,
        172
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "User account"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommonSigner",
          "docs": [
            "User vault common account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "vault_common.requests_count",
                "account": "vaultCommonState"
              }
            ]
          }
        },
        {
          "name": "ac",
          "docs": [
            "AccessControlState account"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "Account access control state account"
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
                  99
                ]
              },
              {
                "kind": "account",
                "path": "ac"
              },
              {
                "kind": "account",
                "path": "signer"
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
          "name": "mMintVaultAta",
          "docs": [
            "mMint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintFeeReceiverAta",
          "docs": [
            "mMint fee receiver ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault_common.fee_receiver",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintSignerAta",
          "docs": [
            "mMint signer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint SPL account"
          ],
          "writable": true
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint data feed state account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed state account"
          ]
        },
        {
          "name": "pauseInxState",
          "docs": [
            "Instruction pause state account"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "const",
                "value": [
                  4
                ]
              }
            ]
          }
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountMToken",
          "type": "u64"
        }
      ]
    },
    {
      "name": "rejectMintRequest",
      "discriminator": [
        95,
        142,
        147,
        85,
        22,
        230,
        95,
        158
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "mintRequest",
          "docs": [
            "Mint request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "rejectRedeemRequest",
      "discriminator": [
        143,
        45,
        66,
        182,
        62,
        169,
        108,
        212
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removePaymentToken",
      "discriminator": [
        119,
        18,
        240,
        223,
        126,
        168,
        165,
        117
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "arg",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "mint",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "safeApproveMintRequestAtCurrentRate",
      "discriminator": [
        167,
        6,
        79,
        196,
        138,
        117,
        253,
        34
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "vaultMinterRole",
          "docs": [
            "Vault minter role"
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
                "path": "token_authority.ac_role",
                "account": "tokenAuthorityState"
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "mintRequest",
          "docs": [
            "Mint vault request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority state account (token-authority program)"
          ],
          "writable": true
        },
        {
          "name": "mMintUserAta",
          "docs": [
            "mMint ATA of `user_account`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userAccount"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "SPL mint account"
          ],
          "writable": true
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint data feed state account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed account"
          ]
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "SPL token program for mMint"
          ]
        },
        {
          "name": "tokenAuthorityProgram",
          "docs": [
            "Token authority program"
          ],
          "address": "MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "skipOnSupplyCapExceeded",
          "type": "bool"
        }
      ]
    },
    {
      "name": "safeApproveMintRequestAtRequestRate",
      "discriminator": [
        1,
        70,
        226,
        226,
        236,
        34,
        235,
        68
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "vaultMinterRole",
          "docs": [
            "Vault minter role"
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
                "path": "token_authority.ac_role",
                "account": "tokenAuthorityState"
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "mintRequest",
          "docs": [
            "Mint vault request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "minterVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority state account (token-authority program)"
          ],
          "writable": true
        },
        {
          "name": "mMintUserAta",
          "docs": [
            "mMint ATA of `user_account`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userAccount"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "SPL mint account"
          ],
          "writable": true
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "SPL token program for mMint"
          ]
        },
        {
          "name": "tokenAuthorityProgram",
          "docs": [
            "Token authority program"
          ],
          "address": "MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "skipOnSupplyCapExceeded",
          "type": "bool"
        }
      ]
    },
    {
      "name": "safeApproveRedeemRequestAtCurrentRate",
      "discriminator": [
        119,
        126,
        27,
        142,
        94,
        245,
        214,
        44
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "requestRedeemer",
          "docs": [
            "request redeemer account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "paymentMintUserAta",
          "docs": [
            "Payment mint user ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userAccount"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMint",
          "docs": [
            "Payment mint SPL account"
          ],
          "writable": true
        },
        {
          "name": "paymentMintRedeemerAta",
          "docs": [
            "payment mint redeemer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "requestRedeemer"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintVaultAta",
          "docs": [
            "mMint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint SPL account"
          ],
          "writable": true
        },
        {
          "name": "mMintDataFeed",
          "docs": [
            "mMint data feed state account"
          ]
        },
        {
          "name": "mMintFeed",
          "docs": [
            "mMint underlying feed account"
          ]
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "Payment mint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "safeValidateLiquidity",
          "type": "bool"
        }
      ]
    },
    {
      "name": "safeApproveRedeemRequestAtRequestRate",
      "discriminator": [
        214,
        80,
        214,
        83,
        88,
        218,
        180,
        177
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "userAccount",
          "docs": [
            "request user account"
          ],
          "writable": true
        },
        {
          "name": "requestRedeemer",
          "docs": [
            "request redeemer account"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ]
          }
        },
        {
          "name": "redeemRequest",
          "docs": [
            "Redeem request state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "arg",
                "path": "requestId"
              }
            ]
          }
        },
        {
          "name": "paymentMintUserAta",
          "docs": [
            "Payment mint user ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userAccount"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "paymentMint",
          "docs": [
            "Payment mint SPL account"
          ],
          "writable": true
        },
        {
          "name": "paymentMintRedeemerAta",
          "docs": [
            "payment mint redeemer ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "requestRedeemer"
              },
              {
                "kind": "account",
                "path": "paymentMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "paymentMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMintVaultAta",
          "docs": [
            "mMint vault ATA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "redeemerVault"
              },
              {
                "kind": "account",
                "path": "mMintTokenProgram"
              },
              {
                "kind": "account",
                "path": "mMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mMint",
          "docs": [
            "mMint SPL account"
          ],
          "writable": true
        },
        {
          "name": "mMintTokenProgram",
          "docs": [
            "mMint token program"
          ]
        },
        {
          "name": "paymentMintTokenProgram",
          "docs": [
            "Payment mint token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestId",
          "type": "u64"
        },
        {
          "name": "safeValidateLiquidity",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updateCommonVault",
      "discriminator": [
        24,
        56,
        127,
        210,
        68,
        17,
        241,
        189
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "greenlistEnforced",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "acRole",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "tokensReceiver",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "feeReceiver",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "instantFee",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "instantDailyLimit",
          "type": {
            "option": "u128"
          }
        },
        {
          "name": "variationTolerance",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "minAmount",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "updateCommonVaultAccount",
      "discriminator": [
        27,
        138,
        204,
        82,
        53,
        81,
        152,
        180
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "account",
          "docs": [
            "Account to update"
          ],
          "writable": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "vaultCommonAccount",
          "docs": [
            "Vault common account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
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
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "account"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "freeFromMinAmount",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "freeFromMinFirstMint",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "waivedFee",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updateMinterVault",
      "discriminator": [
        125,
        157,
        225,
        51,
        226,
        210,
        5,
        212
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "minterVault",
          "docs": [
            "Minter vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newFirstDepositMinMTokens",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "mintAuthorityPda",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "maxSupplyCap",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "updatePause",
      "discriminator": [
        6,
        56,
        103,
        134,
        181,
        122,
        69,
        108
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault pauser role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Pauser role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  112,
                  97,
                  117,
                  115,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updatePauseInx",
      "discriminator": [
        103,
        212,
        50,
        212,
        70,
        195,
        58,
        49
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault pauser role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Pauser role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  112,
                  97,
                  117,
                  115,
                  101,
                  114,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "pauseInxState",
          "docs": [
            "Pause index state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  95,
                  105,
                  110,
                  120,
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
                "path": "vaultCommon"
              },
              {
                "kind": "arg",
                "path": "fnId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fnId",
          "type": "u8"
        },
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updatePaymentToken",
      "discriminator": [
        240,
        107,
        161,
        243,
        84,
        148,
        183,
        126
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "paymentMintState",
          "docs": [
            "Payment mint state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              },
              {
                "kind": "account",
                "path": "payment_mint_state.mint",
                "account": "paymentMintState"
              }
            ]
          }
        },
        {
          "name": "newDataFeed",
          "docs": [
            "New data feed account that will be set for the payment mint"
          ],
          "optional": true
        },
        {
          "name": "dataFeedProgram",
          "docs": [
            "Data feed program"
          ],
          "address": "MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "allowance",
          "type": {
            "option": "u128"
          }
        },
        {
          "name": "stable",
          "type": {
            "option": "bool"
          }
        }
      ]
    },
    {
      "name": "updateRedeemerVault",
      "discriminator": [
        62,
        62,
        202,
        96,
        101,
        9,
        176,
        142
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ]
        },
        {
          "name": "authorityAcRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "redeemerVault",
          "docs": [
            "Redeemer vault state account"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  101,
                  109,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "vaultCommon"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "requestRedeemer",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "minFiatRedeemAmount",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "fiatFlatFee",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "withdrawTokens",
      "discriminator": [
        2,
        4,
        225,
        61,
        19,
        182,
        106,
        170
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with vault admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "receiver",
          "docs": [
            "receiver of tokens"
          ]
        },
        {
          "name": "vaultCommon",
          "docs": [
            "Vault common state account"
          ],
          "writable": true
        },
        {
          "name": "authorityAdminRole",
          "docs": [
            "Admin role of authority"
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
                "path": "vault_common.ac_role",
                "account": "vaultCommonState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  97,
                  100,
                  109,
                  105,
                  110,
                  95,
                  114,
                  111,
                  108,
                  101
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
          "name": "vault"
        },
        {
          "name": "mintReceiverAta",
          "docs": [
            "ATA of `receiver`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "receiver"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mintVaultAta",
          "docs": [
            "ATA of `vault`"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "docs": [
            "SPL mint account to withdraw"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "vaultSeed",
          "type": "bytes"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "accessControlState",
      "discriminator": [
        224,
        197,
        223,
        174,
        176,
        46,
        18,
        174
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
      "name": "accountAccessControlState",
      "discriminator": [
        88,
        168,
        223,
        83,
        103,
        86,
        53,
        218
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
      "name": "mintVaultRequestState",
      "discriminator": [
        228,
        106,
        231,
        2,
        152,
        192,
        190,
        253
      ]
    },
    {
      "name": "minterVaultState",
      "discriminator": [
        7,
        226,
        177,
        77,
        86,
        188,
        114,
        219
      ]
    },
    {
      "name": "pauseInxState",
      "discriminator": [
        242,
        158,
        58,
        254,
        162,
        140,
        43,
        65
      ]
    },
    {
      "name": "paymentMintState",
      "discriminator": [
        211,
        61,
        190,
        68,
        56,
        200,
        120,
        210
      ]
    },
    {
      "name": "redeemerVaultRequestState",
      "discriminator": [
        144,
        235,
        150,
        139,
        137,
        164,
        229,
        217
      ]
    },
    {
      "name": "redeemerVaultState",
      "discriminator": [
        145,
        246,
        171,
        124,
        64,
        63,
        113,
        46
      ]
    },
    {
      "name": "tokenAuthorityState",
      "discriminator": [
        214,
        234,
        125,
        70,
        178,
        214,
        237,
        125
      ]
    },
    {
      "name": "vaultCommonAccountState",
      "discriminator": [
        73,
        22,
        98,
        226,
        178,
        77,
        219,
        53
      ]
    },
    {
      "name": "vaultCommonState",
      "discriminator": [
        68,
        255,
        204,
        79,
        24,
        223,
        185,
        114
      ]
    }
  ],
  "events": [
    {
      "name": "commonVaultAccountUpdatedEvent",
      "discriminator": [
        14,
        156,
        181,
        17,
        26,
        1,
        246,
        170
      ]
    },
    {
      "name": "commonVaultUpdatedEvent",
      "discriminator": [
        142,
        39,
        120,
        188,
        8,
        71,
        46,
        51
      ]
    },
    {
      "name": "minterVaultInstantMintedEvent",
      "discriminator": [
        100,
        106,
        122,
        190,
        208,
        244,
        0,
        227
      ]
    },
    {
      "name": "minterVaultRequestApprovedEvent",
      "discriminator": [
        204,
        11,
        8,
        168,
        136,
        254,
        173,
        193
      ]
    },
    {
      "name": "minterVaultRequestCreatedEvent",
      "discriminator": [
        122,
        132,
        207,
        55,
        31,
        218,
        122,
        189
      ]
    },
    {
      "name": "minterVaultRequestRejectedEvent",
      "discriminator": [
        3,
        45,
        215,
        43,
        48,
        236,
        132,
        129
      ]
    },
    {
      "name": "minterVaultUpdatedEvent",
      "discriminator": [
        184,
        92,
        172,
        74,
        217,
        3,
        6,
        85
      ]
    },
    {
      "name": "minterVaultUpdatedEventV2",
      "discriminator": [
        181,
        137,
        94,
        50,
        59,
        196,
        135,
        23
      ]
    },
    {
      "name": "pauseInxUpdatedEvent",
      "discriminator": [
        74,
        143,
        181,
        87,
        70,
        178,
        98,
        90
      ]
    },
    {
      "name": "pauseUpdatedEvent",
      "discriminator": [
        181,
        206,
        46,
        3,
        114,
        110,
        43,
        211
      ]
    },
    {
      "name": "paymentTokenRemovedEvent",
      "discriminator": [
        147,
        130,
        58,
        87,
        240,
        173,
        255,
        186
      ]
    },
    {
      "name": "paymentTokenUpdatedEvent",
      "discriminator": [
        254,
        19,
        164,
        176,
        164,
        255,
        240,
        113
      ]
    },
    {
      "name": "redeemerVaultInstantRedeemedEvent",
      "discriminator": [
        22,
        131,
        26,
        119,
        116,
        178,
        163,
        211
      ]
    },
    {
      "name": "redeemerVaultRequestApprovedEvent",
      "discriminator": [
        170,
        45,
        216,
        43,
        119,
        216,
        95,
        171
      ]
    },
    {
      "name": "redeemerVaultRequestCreatedEvent",
      "discriminator": [
        133,
        203,
        102,
        117,
        207,
        92,
        0,
        97
      ]
    },
    {
      "name": "redeemerVaultRequestRejectedEvent",
      "discriminator": [
        115,
        121,
        105,
        246,
        141,
        194,
        183,
        160
      ]
    },
    {
      "name": "redeemerVaultUpdatedEvent",
      "discriminator": [
        110,
        159,
        47,
        72,
        246,
        173,
        173,
        127
      ]
    },
    {
      "name": "tokensWithdrawnEvent",
      "discriminator": [
        226,
        188,
        19,
        166,
        84,
        192,
        103,
        214
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAuthority",
      "msg": "Not an authority"
    },
    {
      "code": 6001,
      "name": "notGreenListed",
      "msg": "Account is not green listed"
    },
    {
      "code": 6002,
      "name": "blacklisted",
      "msg": "Account is black listed"
    },
    {
      "code": 6003,
      "name": "vaultPaused",
      "msg": "Vault is paused"
    },
    {
      "code": 6004,
      "name": "vaultInxPaused",
      "msg": "Vault instruction is paused"
    },
    {
      "code": 6005,
      "name": "lessThanMinAmount",
      "msg": "Amount is less than min."
    },
    {
      "code": 6006,
      "name": "lessThanMinAmountFirstMint",
      "msg": "Amount is less than min. for the first mint"
    },
    {
      "code": 6007,
      "name": "insufficientAllowance",
      "msg": "Insufficient allowance for the payment mint"
    },
    {
      "code": 6008,
      "name": "dailyLimitExceeded",
      "msg": "Daily limit is exceeded"
    },
    {
      "code": 6009,
      "name": "variationToleranceExceeded",
      "msg": "Variation tolerance exceeded"
    },
    {
      "code": 6010,
      "name": "invalidFee",
      "msg": "Invalid fee value"
    },
    {
      "code": 6011,
      "name": "invalidInAmount",
      "msg": "Invalid input amount value"
    },
    {
      "code": 6012,
      "name": "invalidOutAmount",
      "msg": "Invalid output amount value"
    },
    {
      "code": 6013,
      "name": "invalidConvertAmount",
      "msg": "Invalid convert amount value"
    },
    {
      "code": 6014,
      "name": "invalidRate",
      "msg": "Invalid rate"
    },
    {
      "code": 6015,
      "name": "lessThanMinReceiveAmount",
      "msg": "Output amount is less than min. to receive"
    },
    {
      "code": 6016,
      "name": "invalidPaymentMint",
      "msg": "Invalid payment mint provided"
    },
    {
      "code": 6017,
      "name": "invalidSeedProvided",
      "msg": "Invalid seed provided"
    },
    {
      "code": 6018,
      "name": "invalidVaultProvided",
      "msg": "Invalid vault provided"
    },
    {
      "code": 6019,
      "name": "valueDidntChange",
      "msg": "The new value is the same as the old one"
    },
    {
      "code": 6020,
      "name": "maxSupplyCapExceeded",
      "msg": "Max supply cap exceeded"
    },
    {
      "code": 6021,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow or underflow"
    }
  ],
  "types": [
    {
      "name": "accessControlState",
      "docs": [
        "State layout for Access Control",
        "The purpose of that account is to use it as a base",
        "key account to generate PDAs that will hold `AccountAccessControlState`",
        "The reason why we dont use AccessControlRoleState for that, is because",
        "green_list and black_list can be shared between different mProducts,",
        "but different mProducts will have different AccessControlRole assigned"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "acRole",
            "docs": [
              "`AccessControlRoleState` account"
            ],
            "type": "pubkey"
          }
        ]
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
      "name": "accountAccessControlState",
      "docs": [
        "access-control program do not consume green_listed and black_listed",
        "values anywhere, but midas-vaults do. If green_listed is true -",
        "then it might open an access to some instruction for a user",
        "If black_listed is true - it might restrict some instructions.",
        "Please check midas-vaults documentation how exactly those values affects"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "greenListed",
            "docs": [
              "Is account green listed"
            ],
            "type": "bool"
          },
          {
            "name": "blackListed",
            "docs": [
              "Is account black listed listed"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "calcAndValidateDepositReturn",
      "docs": [
        "Return type for `calc_and_validate_deposit`"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mintAmountInUsd",
            "docs": [
              "How much of mToken to mint in USD"
            ],
            "type": "u128"
          },
          {
            "name": "feeTokenAmount",
            "docs": [
              "Fee amount in payment token"
            ],
            "type": "u128"
          },
          {
            "name": "amountTokenWoFee",
            "docs": [
              "Original payment token amount without fee"
            ],
            "type": "u128"
          },
          {
            "name": "mTokenAmount",
            "docs": [
              "How much of mToken to mint"
            ],
            "type": "u128"
          },
          {
            "name": "mintInRate",
            "docs": [
              "Payment mint rate"
            ],
            "type": "u128"
          },
          {
            "name": "mTokenRate",
            "docs": [
              "mToken rate"
            ],
            "type": "u128"
          },
          {
            "name": "decimals",
            "docs": [
              "Payment mint decimals"
            ],
            "type": "u8"
          },
          {
            "name": "depositedUsd",
            "docs": [
              "Deposited amount in USD exluding all fees"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "commonVaultAccountUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "Common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "account",
            "docs": [
              "Common account owner"
            ],
            "type": "pubkey"
          },
          {
            "name": "freeFromMinAmount",
            "docs": [
              "Is free from min amount"
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "freeFromMinFirstMint",
            "docs": [
              "Is free from min first mint"
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "waivedFee",
            "docs": [
              "Is fee waived"
            ],
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "commonVaultUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vaultCommon",
            "docs": [
              "Common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "ac",
            "docs": [
              "AccessControl account"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "mMint",
            "docs": [
              "mToken mint account"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "mMintFeed",
            "docs": [
              "mToken/USD data feed account"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "greenlistEnforced",
            "docs": [
              "is green list enforced"
            ],
            "type": {
              "option": "bool"
            }
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
            "name": "tokensReceiver",
            "docs": [
              "Tokens receiver"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "feeReceiver",
            "docs": [
              "Fee receiver"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "instantFee",
            "docs": [
              "Instant fee"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "instantDailyLimit",
            "docs": [
              "Instant daily limit"
            ],
            "type": {
              "option": "u128"
            }
          },
          {
            "name": "variationTolerance",
            "docs": [
              "Variation tolerance"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "minAmount",
            "docs": [
              "Min amount"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
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
      "name": "mintVaultRequestState",
      "docs": [
        "Minting request state definition"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "docs": [
              "Request creator pubkey"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "docs": [
              "Payment mint used during the req. creation"
            ],
            "type": "pubkey"
          },
          {
            "name": "depositedUsd",
            "docs": [
              "Deposited of `payment_mint` in USD"
            ],
            "type": "u64"
          },
          {
            "name": "depositedUsdWoFees",
            "docs": [
              "Deposited of `payment_mint` in USD excluding all fees"
            ],
            "type": "u64"
          },
          {
            "name": "mMintRate",
            "docs": [
              "mMint/USD price during that was on the moment of",
              "request creation"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "minterVaultInstantMintedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "signer",
            "docs": [
              "inx signer (user)"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "docs": [
              "payment mint used in inx"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentAmount",
            "docs": [
              "amount of payment mint in base9"
            ],
            "type": "u64"
          },
          {
            "name": "calculated",
            "docs": [
              "internal minting calculation results"
            ],
            "type": {
              "defined": {
                "name": "calcAndValidateDepositReturn"
              }
            }
          },
          {
            "name": "referrerId",
            "docs": [
              "referrer id"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "minterVaultRequestApprovedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestId",
            "docs": [
              "approved request id"
            ],
            "type": "u64"
          },
          {
            "name": "newOutRate",
            "docs": [
              "mToken rate passed by vault admin"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "minterVaultRequestCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "signer",
            "docs": [
              "inx signer (user)"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "docs": [
              "payment mint used in inx"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentAmount",
            "docs": [
              "amount of payment mint in base9"
            ],
            "type": "u64"
          },
          {
            "name": "requestId",
            "docs": [
              "generated request id"
            ],
            "type": "u64"
          },
          {
            "name": "calculated",
            "docs": [
              "internal minting calculation results"
            ],
            "type": {
              "defined": {
                "name": "calcAndValidateDepositReturn"
              }
            }
          },
          {
            "name": "referrerId",
            "docs": [
              "referrer id"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "minterVaultRequestRejectedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestId",
            "docs": [
              "rejected request id"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "minterVaultState",
      "docs": [
        "Current version - V2",
        "- Added max_supply_cap field",
        "",
        "Minter Vault state definition",
        "Contains everything that is only",
        "minter-vault related, everything that can be shared",
        "with redeemer-vault should stay in common-vault"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "firstDepositMinMTokens",
            "docs": [
              "minimal amount of mTokens that user should",
              "acquire during the first mint"
            ],
            "type": "u64"
          },
          {
            "name": "commonVault",
            "docs": [
              "common-vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "mintAuthorityPda",
            "docs": [
              "mint authority pda (token-authority program)"
            ],
            "type": "pubkey"
          },
          {
            "name": "maxSupplyCap",
            "docs": [
              "max supply cap for mToken minting"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "minterVaultUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "firstDepositMinMTokens",
            "docs": [
              "min. mTokens for first deposit"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "mintAuthorityPda",
            "docs": [
              "mint authority pda (token-authority program)"
            ],
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "minterVaultUpdatedEventV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "firstDepositMinMTokens",
            "docs": [
              "min. mTokens for first deposit"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "mintAuthorityPda",
            "docs": [
              "mint authority pda (token-authority program)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "maxSupplyCap",
            "docs": [
              "max supply cap for mToken minting"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "pauseInxState",
      "docs": [
        "Holds paused state for a specific inx"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "docs": [
              "paused state"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "pauseInxUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "fnId",
            "docs": [
              "function id"
            ],
            "type": "u8"
          },
          {
            "name": "paused",
            "docs": [
              "is inx was paused or unpaused"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "pauseUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "paused",
            "docs": [
              "is vault was paused or unpaused"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "paymentMintState",
      "docs": [
        "Holds configuration for a specific payment token"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "SPL mint of a payment token"
            ],
            "type": "pubkey"
          },
          {
            "name": "dataFeed",
            "docs": [
              "Payment token to USD data feed (data-feed program)"
            ],
            "type": "pubkey"
          },
          {
            "name": "fee",
            "docs": [
              "Additional fee for a payment token"
            ],
            "type": "u64"
          },
          {
            "name": "allowance",
            "docs": [
              "Current allowance for a mint/redeem per payment token",
              "If set to `MAX_UINT128` - it means that its infinite and wont be decreased",
              "during mints/redeems"
            ],
            "type": "u128"
          },
          {
            "name": "stable",
            "docs": [
              "Indicates whether payment token should use 1:1 USD rate or not",
              "(min/max price boundaries should be properly set in `data_feed`)"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "paymentTokenRemovedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "Common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Payment mint"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "paymentTokenUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "Common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Payment mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "dataFeed",
            "docs": [
              "Payment mint USD data feed"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "fee",
            "docs": [
              "Payment token fee"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "allowance",
            "docs": [
              "Payment token allowance"
            ],
            "type": {
              "option": "u128"
            }
          },
          {
            "name": "stable",
            "docs": [
              "Is payment token stable"
            ],
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "redeemerVaultInstantRedeemedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "signer",
            "docs": [
              "inx signer (user)"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "docs": [
              "output payment mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "amountMToken",
            "docs": [
              "amount of mTokens paid"
            ],
            "type": "u64"
          },
          {
            "name": "amountMTokenInUsd",
            "docs": [
              "amount of mTokens paid in USD"
            ],
            "type": "u128"
          },
          {
            "name": "mTokenRate",
            "docs": [
              "mToken/USD rate"
            ],
            "type": "u128"
          },
          {
            "name": "amountPaymentToken",
            "docs": [
              "amount `payment_token` included fees"
            ],
            "type": "u128"
          },
          {
            "name": "paymentTokenRate",
            "docs": [
              "payment_token/USD rate"
            ],
            "type": "u128"
          },
          {
            "name": "amountPaymentTokenWoFee",
            "docs": [
              "amount `payment_token` received"
            ],
            "type": "u128"
          },
          {
            "name": "decimals",
            "docs": [
              "payment token decimals"
            ],
            "type": "u8"
          },
          {
            "name": "feeAmount",
            "docs": [
              "fee amount in mToken"
            ],
            "type": "u128"
          },
          {
            "name": "mTokenAmountWoFee",
            "docs": [
              "`amount_m_token` - `fee_amount`"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "redeemerVaultRequestApprovedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestId",
            "docs": [
              "generated request id"
            ],
            "type": "u64"
          },
          {
            "name": "newOutRate",
            "docs": [
              "mToken rate passed by vault admin"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redeemerVaultRequestCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "signer",
            "docs": [
              "inx signer (user)"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "docs": [
              "output payment mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestId",
            "docs": [
              "generated request id"
            ],
            "type": "u64"
          },
          {
            "name": "amountMToken",
            "docs": [
              "amount of mTokens paid"
            ],
            "type": "u128"
          },
          {
            "name": "isFiat",
            "docs": [
              "is fiat request"
            ],
            "type": "bool"
          },
          {
            "name": "mTokenRate",
            "docs": [
              "mToken/USD rate"
            ],
            "type": "u128"
          },
          {
            "name": "paymentMintRate",
            "docs": [
              "payment_mint/USD rate"
            ],
            "type": "u128"
          },
          {
            "name": "feeAmount",
            "docs": [
              "mToken fee"
            ],
            "type": "u128"
          },
          {
            "name": "mTokenAmountWoFee",
            "docs": [
              "`amount_m_token` - `fee_amount`"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "redeemerVaultRequestRejectedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestId",
            "docs": [
              "generated request id"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redeemerVaultRequestState",
      "docs": [
        "Redeem request state definition"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "docs": [
              "Request creator pubkey"
            ],
            "type": "pubkey"
          },
          {
            "name": "paymentMint",
            "docs": [
              "Payment mint used during the req. creation"
            ],
            "type": "pubkey"
          },
          {
            "name": "mTokenAmount",
            "docs": [
              "Amount of mToken paid"
            ],
            "type": "u64"
          },
          {
            "name": "paymentMintRate",
            "docs": [
              "payment_mint/USD price during that was on the moment of",
              "request creation"
            ],
            "type": "u64"
          },
          {
            "name": "mTokenRate",
            "docs": [
              "mMint/USD price during that was on the moment of",
              "request creation"
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redeemerVaultState",
      "docs": [
        "Redeemer Vault state definition",
        "Contains everything that is only",
        "redeem-vault related, everything that can be shared",
        "with minter-vault should stay in common-vault"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minFiatRedeemAmount",
            "docs": [
              "Min mToken amount for a fiat redemption"
            ],
            "type": "u64"
          },
          {
            "name": "fiatFlatFee",
            "docs": [
              "Static amount of mToken that will be added",
              "to calculated fees (only for fiat redemptions)"
            ],
            "type": "u64"
          },
          {
            "name": "commonVault",
            "docs": [
              "common-vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "requestRedeemer",
            "docs": [
              "Account from which program will transfer tokens",
              "during requests approval (not ATA)"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "redeemerVaultUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "minFiatRedeemAmount",
            "docs": [
              "min mToken amount for fiat redemption"
            ],
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "requestRedeemer",
            "docs": [
              "request redeemer"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "fiatFlatFee",
            "docs": [
              "fiat flat fee"
            ],
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "tokenAuthorityState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "acRole",
            "docs": [
              "AccessControlRole account that will be used to manage",
              "the access to the token authority instructions"
            ],
            "type": "pubkey"
          },
          {
            "name": "baseSeed",
            "docs": [
              "TokenAuthorityState account PDA seed.",
              "We save it to be able to easily retrieve bump while",
              "doing the token program CPI"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tokensWithdrawnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "commonVault",
            "docs": [
              "Common vault account"
            ],
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "SPL mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "amount of token"
            ],
            "type": "u64"
          },
          {
            "name": "receiver",
            "docs": [
              "receiver of tokens (not ATA)"
            ],
            "type": "pubkey"
          },
          {
            "name": "caller",
            "docs": [
              "caller of the instruction"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "vaultCommonAccountState",
      "docs": [
        "State that holds data about vault user"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "freeFromMinAmount",
            "docs": [
              "Indicates if user is free from min. deposit/redeem boundary"
            ],
            "type": "bool"
          },
          {
            "name": "freeFromMinFirstMint",
            "docs": [
              "Indicates if user is free from first vault operations"
            ],
            "type": "bool"
          },
          {
            "name": "waivedFee",
            "docs": [
              "Indicates if user is free from all vault fees"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "vaultCommonState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ac",
            "docs": [
              "AccessControl state  (access-control program)"
            ],
            "type": "pubkey"
          },
          {
            "name": "paused",
            "docs": [
              "If vault is paused"
            ],
            "type": "bool"
          },
          {
            "name": "greenlistEnforced",
            "docs": [
              "If true - green_list is required for all",
              "mint/redeem operations available for user"
            ],
            "type": "bool"
          },
          {
            "name": "requestsCount",
            "docs": [
              "Mint/Redeem request counter"
            ],
            "type": "u64"
          },
          {
            "name": "mMint",
            "docs": [
              "mToken mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "mMintFeed",
            "docs": [
              "mToken/USD data feed"
            ],
            "type": "pubkey"
          },
          {
            "name": "acRole",
            "docs": [
              "AccessControlRole state"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokensReceiver",
            "docs": [
              "Account that will receive tokens after instant/request flows (not ATA)"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeReceiver",
            "docs": [
              "Account that will receive fees after instant/request flows (not ATA)"
            ],
            "type": "pubkey"
          },
          {
            "name": "instantFee",
            "docs": [
              "Fee in % for instant operations"
            ],
            "type": "u64"
          },
          {
            "name": "instantDailyLimit",
            "docs": [
              "Daily limit for instant operations in mToken"
            ],
            "type": "u128"
          },
          {
            "name": "variationTolerance",
            "docs": [
              "Max. price deviation for request approval"
            ],
            "type": "u64"
          },
          {
            "name": "minAmount",
            "docs": [
              "Min amount for all operations in mToken"
            ],
            "type": "u64"
          },
          {
            "name": "instantLastDay",
            "docs": [
              "Day index recorded during last vault operation"
            ],
            "type": "u32"
          },
          {
            "name": "instantDailyLimitUsed",
            "docs": [
              "Instant daily limit used. When new day comes",
              "it resets to 0 in calculations"
            ],
            "type": "u128"
          }
        ]
      }
    }
  ]
};
