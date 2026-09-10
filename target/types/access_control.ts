/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/access_control.json`.
 */
export type AccessControl = {
  "address": "MAC1H4FiknRdqG7DdEmQXgdp688w8Zo5t44T3CsKt3P",
  "metadata": {
    "name": "accessControl",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "grantRole",
      "discriminator": [
        218,
        234,
        128,
        15,
        82,
        33,
        236,
        253
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
          "name": "account",
          "docs": [
            "New role holder"
          ]
        },
        {
          "name": "acRole",
          "docs": [
            "AC Role state account"
          ],
          "writable": true
        },
        {
          "name": "authorityAcAdminRole",
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
                "path": "acRole"
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
            ]
          }
        },
        {
          "name": "accountAcRole",
          "docs": [
            "Role that will be granted to `account`"
          ],
          "writable": true,
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
                "path": "account"
              },
              {
                "kind": "arg",
                "path": "role"
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
          "name": "role",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "newAc",
      "discriminator": [
        102,
        207,
        29,
        101,
        182,
        9,
        24,
        157
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Init payer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "ac",
          "docs": [
            "New `AccessControlState` instance"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "acRole",
          "docs": [
            "AC Role instance that will be set for a new AC instance"
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
      "name": "newAcRole",
      "discriminator": [
        198,
        34,
        181,
        118,
        199,
        180,
        153,
        186
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Init payer and a new holder of Admin role for the new AC instance"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "acRole",
          "docs": [
            "New `AccessControlRoleState` instance"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "accountAcRole",
          "docs": [
            "New Admin role for `authority`"
          ],
          "writable": true,
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
      "name": "newAccountAc",
      "discriminator": [
        27,
        254,
        114,
        153,
        236,
        105,
        176,
        182
      ],
      "accounts": [
        {
          "name": "signer",
          "docs": [
            "Init payer and signer"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "account",
          "docs": [
            "owner of a new `account_ac`"
          ]
        },
        {
          "name": "ac",
          "docs": [
            "`AccessControlState` instance"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "new `AccountAccessControlState` instance"
          ],
          "writable": true,
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
                "path": "account"
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
      "name": "revokeRole",
      "discriminator": [
        179,
        232,
        2,
        180,
        48,
        227,
        82,
        7
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
          "name": "account",
          "docs": [
            "Role holder"
          ]
        },
        {
          "name": "acRole",
          "docs": [
            "AC Role state account"
          ],
          "writable": true
        },
        {
          "name": "authorityAcAdminRole",
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
                "path": "acRole"
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
            ]
          }
        },
        {
          "name": "accountAcRole",
          "docs": [
            "Role that will be revoked from `account`"
          ],
          "writable": true,
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
                "path": "account"
              },
              {
                "kind": "arg",
                "path": "role"
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
          "name": "role",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "updateAccountAc",
      "discriminator": [
        70,
        19,
        202,
        82,
        140,
        209,
        118,
        105
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
          "name": "account",
          "docs": [
            "`account_ac` owner"
          ],
          "writable": true
        },
        {
          "name": "ac",
          "docs": [
            "AC instance"
          ]
        },
        {
          "name": "accountAc",
          "docs": [
            "`AccountAccessControlState` instance of `account`"
          ],
          "writable": true,
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
                "path": "account"
              }
            ]
          }
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
                "path": "ac.ac_role",
                "account": "accessControlState"
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "const",
                "value": [
                  117,
                  112,
                  100,
                  97,
                  116,
                  101,
                  95,
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
          "name": "greenListed",
          "type": {
            "option": "bool"
          }
        },
        {
          "name": "blackListed",
          "type": {
            "option": "bool"
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
    }
  ],
  "events": [
    {
      "name": "acCreatedEvent",
      "discriminator": [
        91,
        228,
        75,
        123,
        219,
        118,
        180,
        173
      ]
    },
    {
      "name": "acRoleCreatedEvent",
      "discriminator": [
        221,
        169,
        77,
        156,
        165,
        163,
        197,
        136
      ]
    },
    {
      "name": "accountAcRoleUpdatedEvent",
      "discriminator": [
        77,
        207,
        133,
        203,
        213,
        133,
        67,
        199
      ]
    },
    {
      "name": "accountAcUpdatedEvent",
      "discriminator": [
        215,
        33,
        53,
        123,
        171,
        164,
        166,
        234
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
      "name": "bothBlacklistedAndWhitelisted",
      "msg": "Cannot be both blacklisted and whitelisted"
    },
    {
      "code": 6002,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow or underflow"
    }
  ],
  "types": [
    {
      "name": "acCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ac",
            "docs": [
              "Created AccessControl account"
            ],
            "type": "pubkey"
          },
          {
            "name": "acRole",
            "docs": [
              "AccessControlRole account that was set in `ac`"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "acRoleCreatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "acRole",
            "docs": [
              "Created AccessControlRole account"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
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
      "name": "accountAcRoleUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "acRole",
            "docs": [
              "AccessControlRole account"
            ],
            "type": "pubkey"
          },
          {
            "name": "account",
            "docs": [
              "Role owner"
            ],
            "type": "pubkey"
          },
          {
            "name": "role",
            "docs": [
              "Role identifier"
            ],
            "type": "bytes"
          },
          {
            "name": "has",
            "docs": [
              "If true - grant_role was called, revoke_role otherwise"
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "accountAcUpdatedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ac",
            "docs": [
              "AccessControl account"
            ],
            "type": "pubkey"
          },
          {
            "name": "accountAc",
            "docs": [
              "AccountAccessControl account"
            ],
            "type": "pubkey"
          },
          {
            "name": "greenListed",
            "docs": [
              "New green_listed value (if presented)"
            ],
            "type": {
              "option": "bool"
            }
          },
          {
            "name": "blackListed",
            "docs": [
              "New black_listed value (if presented)"
            ],
            "type": {
              "option": "bool"
            }
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
    }
  ]
};
