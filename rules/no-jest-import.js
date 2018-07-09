'use strict';

const matches = require('@macklinu/matches');
const getDocsUrl = require('./util').getDocsUrl;
const getNodeName = require('./util').getNodeName;
const message = `Jest is automatically in scope. Do not import "jest", as Jest doesn't export anything.`;

const isJestRequire = matches({
  callee: callee => getNodeName(callee) === 'require',
  'arguments.0.value': 'jest',
});

module.exports = {
  meta: {
    docs: {
      url: getDocsUrl(__filename),
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'jest') {
          context.report({
            node,
            message,
          });
        }
      },
      CallExpression(node) {
        if (isJestRequire(node)) {
          context.report({
            loc: {
              end: {
                column: node.arguments[0].loc.end.column,
                line: node.arguments[0].loc.end.line,
              },
              start: node.arguments[0].loc.start,
            },
            message,
          });
        }
      },
    };
  },
};
