'use strict';

const matches = require('@macklinu/matches');
const getDocsUrl = require('./util').getDocsUrl;

const TEST_FUNCTION_REGEX = /^describe|it|test$/;

const matchesTestFunction = matches({
  name: TEST_FUNCTION_REGEX,
});

const isCallToFocusedTestFunction = matches({
  name: name => name[0] === 'f' && TEST_FUNCTION_REGEX.test(name.substring(1)),
});

const isPropertyNamedOnly = property =>
  property && (property.name === 'only' || property.value === 'only');

const isCallToTestOnlyFunction = callee =>
  matchesTestFunction(callee.object) && isPropertyNamedOnly(callee.property);

module.exports = {
  meta: {
    docs: {
      url: getDocsUrl(__filename),
    },
  },
  create: context => ({
    CallExpression(node) {
      const callee = node.callee;

      if (
        callee.type === 'MemberExpression' &&
        isCallToTestOnlyFunction(callee)
      ) {
        context.report({
          message: 'Unexpected focused test.',
          node: callee.property,
        });
        return;
      }

      if (callee.type === 'Identifier' && isCallToFocusedTestFunction(callee)) {
        context.report({
          message: 'Unexpected focused test.',
          node: callee,
        });
        return;
      }
    },
  }),
};
