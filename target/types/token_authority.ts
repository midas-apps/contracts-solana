/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/token_authority.json`.
 */
export type TokenAuthority = {
  "address": "MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa",
  "metadata": {
    "name": "tokenAuthority",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "burn",
      "discriminator": [
        116,
        110,
        29,
        56,
        107,
        219,
        42,
        93
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with burner role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "from",
          "docs": [
            "account to burn from"
          ]
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority PDA"
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
            ]
          }
        },
        {
          "name": "authorityBurnRole",
          "docs": [
            "`authority` burner role"
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
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  98,
                  117,
                  114,
                  110,
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
          "name": "mint",
          "docs": [
            "SPL mint account (SplBurn::mint)"
          ],
          "writable": true
        },
        {
          "name": "fromAta",
          "docs": [
            "ATA of `from` (ThawAccount::from)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "from"
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
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "freeze",
      "discriminator": [
        255,
        91,
        207,
        84,
        251,
        194,
        254,
        63
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with freezer role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "toFreeze",
          "docs": [
            "account to freeze"
          ]
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority PDA"
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
            ]
          }
        },
        {
          "name": "authorityFreezeRole",
          "docs": [
            "`authority` freeze role"
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
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  102,
                  114,
                  101,
                  101,
                  122,
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
          "name": "mint",
          "docs": [
            "SPL mint account (FreezeAccount::mint)"
          ],
          "writable": true
        },
        {
          "name": "toFreezeAta",
          "docs": [
            "ATA of `to_to_freeze` (FreezeAccount::account)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "toFreeze"
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
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mint",
      "discriminator": [
        51,
        57,
        225,
        47,
        182,
        146,
        137,
        166
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with minter role"
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
          "name": "tokenAuthority",
          "docs": [
            "Token authority PDA"
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
            ]
          }
        },
        {
          "name": "authorityMinterRole",
          "docs": [
            "`authority` minter role"
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
                "path": "authority"
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
          "name": "mint",
          "docs": [
            "SPL mint account (MintTo::mint)"
          ],
          "writable": true
        },
        {
          "name": "receiverAta",
          "docs": [
            "ATA of `receiver` (MintTo::account)"
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
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "newTokenAuthority",
      "discriminator": [
        83,
        144,
        239,
        29,
        202,
        181,
        14,
        243
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Init Payer and signer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "New Token authority PDA"
          ],
          "writable": true,
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
                "kind": "arg",
                "path": "baseSeed"
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
          "name": "baseSeed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "acRole",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "setAuthority",
      "discriminator": [
        133,
        250,
        37,
        21,
        110,
        163,
        26,
        121
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with admin role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority PDA"
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
            ]
          }
        },
        {
          "name": "authorityAdminRole",
          "docs": [
            "`authority` admin role"
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
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
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
          "name": "accountOrMint",
          "docs": [
            "account update authority on (SplSetAuthority::account_or_mint)"
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
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "authorityType",
          "type": "u8"
        },
        {
          "name": "newAuthority",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "thaw",
      "discriminator": [
        226,
        249,
        34,
        57,
        189,
        21,
        177,
        101
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Account with freezer role"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "toThaw",
          "docs": [
            "account to thaw"
          ]
        },
        {
          "name": "tokenAuthority",
          "docs": [
            "Token authority PDA"
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
            ]
          }
        },
        {
          "name": "authorityFreezeRole",
          "docs": [
            "`authority` freeze role"
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
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  95,
                  102,
                  114,
                  101,
                  101,
                  122,
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
          "name": "mint",
          "docs": [
            "SPL mint account (ThawAccount::mint)"
          ],
          "writable": true
        },
        {
          "name": "toThawAta",
          "docs": [
            "ATA of `to_thaw` (ThawAccount::account)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "toThaw"
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
          "name": "tokenProgram",
          "docs": [
            "SPL token program"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
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
    }
  ],
  "types": [
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
    }
  ]
};
