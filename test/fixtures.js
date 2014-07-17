module.exports = {
  SearchFieldTest: {
    "ModuleA": {
      "name": "ModuleA",
      "description": "This description doesn't say much.",
      "dependencies": {
        "lodash": "^2.4.1"
      }
    },
    "ModuleB": {
      "name": "ModuleB",
      "description": "This description doesn't say much. Works well with ModuleA"
    },
    "ModuleC": {
      "name": "ModuleC",
      "description": "This description doesn't say much.",
      "author": "Same author as of ModuleA"
    },
    "ModuleD": {
      "name": "ModuleD",
      "description": "This description doesn't say much.",
      "author": {
         "name": "I'm an object",
         "email": "foo@example.com"
      },
      "dependencies": {
        "debug": "^1.0.4",
      }
    },
    "ModuleE": {
      "name": "ModuleD",
      "description": "This description doesn't say much.",
      "author": {
         "name": "I'm a tree",
         "email": "bar@example.com"
      },
      "dependencies": {
        "debug": "^1.0.4",
        "fuzzy-filter": "0.0.3",
        "lodash": "^2.4.1"
      }
    },
  }
  // make one for each test case
};