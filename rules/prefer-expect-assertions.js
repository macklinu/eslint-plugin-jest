'use strict';

const matches = require('@macklinu/matches');
const getDocsUrl = require('./util').getDocsUrl;

const ruleMsg =
  'Every test should have either `expect.assertions(<number of assertions>)` or `expect.hasAssertions()` as its first expression';

const validateArguments = expression => {
  return (
    expression.arguments &&
    expression.arguments.length === 1 &&
    Number.isInteger(expression.arguments[0].value)
  );
};

const isExpectAssertionsOrHasAssertionsCall = node =>
  matches({
    type: 'CallExpression',
    'callee.type': 'MemberExpression',
    'callee.object.name': 'expect',
    'callee.property.name'(name) {
      const isAssertion = /^assertions|hasAssertions/.test(name);
      if (!isAssertion) {
        return false;
      }
      if (name === 'assertions') {
        return validateArguments(node);
      }
      return true;
    },
  })(node);

const isTestOrItFunction = matches({
  type: 'CallExpression',
  'callee.name': /^it|test$/,
});

const getFunctionFirstLine = functionBody => {
  return functionBody[0] && functionBody[0].expression;
};

const isFirstLineExprStmt = functionBody => {
  return functionBody[0] && functionBody[0].type === 'ExpressionStatement';
};

const getTestFunctionBody = node => {
  try {
    return node.arguments[1].body.body;
  } catch (e) {
    return undefined;
  }
};

const reportMsg = (context, node) => {
  context.report({
    message: ruleMsg,
    node,
  });
};

module.exports = {
  meta: {
    docs: {
      url: getDocsUrl(__filename),
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isTestOrItFunction(node)) {
          const testFuncBody = getTestFunctionBody(node);
          if (testFuncBody) {
            if (!isFirstLineExprStmt(testFuncBody)) {
              reportMsg(context, node);
            } else {
              const testFuncFirstLine = getFunctionFirstLine(testFuncBody);
              if (!isExpectAssertionsOrHasAssertionsCall(testFuncFirstLine)) {
                reportMsg(context, node);
              }
            }
          }
        }
      },
    };
  },
};
