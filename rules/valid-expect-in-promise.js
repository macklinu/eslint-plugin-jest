'use strict';

const matches = require('@macklinu/matches');
const getDocsUrl = require('./util').getDocsUrl;
const isFunction = require('./util').isFunction;

const reportMsg =
  'Promise should be returned to test its fulfillment or rejection';

const isThenOrCatch = matches({ 'property.name': /^then|catch$/ });

const isExpectCallPresentInFunction = body => {
  if (body.type === 'BlockStatement') {
    return body.body.find(line => {
      if (line.type === 'ExpressionStatement')
        return isExpectCall(line.expression);
      if (line.type === 'ReturnStatement') return isExpectCall(line.argument);
    });
  } else {
    return isExpectCall(body);
  }
};

const isExpectCall = matches({
  type: 'CallExpression',
  'callee.type': 'MemberExpression',
  'callee.object.type': 'CallExpression',
  'callee.object.callee.name': 'expect',
});

const reportReturnRequired = (context, node) => {
  context.report({
    loc: {
      end: {
        column: node.parent.parent.loc.end.column,
        line: node.parent.parent.loc.end.line,
      },
      start: node.parent.parent.loc.start,
    },
    message: reportMsg,
    node,
  });
};

const isPromiseReturnedLater = (node, testFunctionBody) => {
  let promiseName;
  if (node.parent.parent.type === 'ExpressionStatement') {
    promiseName = node.parent.parent.expression.callee.object.name;
  } else if (node.parent.parent.type === 'VariableDeclarator') {
    promiseName = node.parent.parent.id.name;
  }
  const lastLineInTestFunc = testFunctionBody[testFunctionBody.length - 1];
  return (
    lastLineInTestFunc.type === 'ReturnStatement' &&
    lastLineInTestFunc.argument.name === promiseName
  );
};

const isTestFunc = matches({
  type: 'CallExpression',
  'callee.name': /^it|test$/,
});

const getFunctionBody = func => {
  if (func.body.type === 'BlockStatement') return func.body.body;
  return func.body; //arrow-short-hand-fn
};

const getTestFunction = node => {
  let parent = node.parent;
  while (parent) {
    if (isFunction(parent) && isTestFunc(parent.parent)) {
      return parent;
    }
    parent = parent.parent;
  }
};

const isParentThenOrPromiseReturned = (node, testFunctionBody) => {
  return (
    testFunctionBody.type === 'CallExpression' ||
    node.parent.parent.type === 'ReturnStatement' ||
    isPromiseReturnedLater(node, testFunctionBody) ||
    isThenOrCatch(node.parent.parent)
  );
};

const verifyExpectWithReturn = (
  promiseCallbacks,
  node,
  context,
  testFunctionBody
) => {
  promiseCallbacks.some(promiseCallback => {
    if (promiseCallback && isFunction(promiseCallback)) {
      if (
        isExpectCallPresentInFunction(promiseCallback.body) &&
        !isParentThenOrPromiseReturned(node, testFunctionBody)
      ) {
        reportReturnRequired(context, node);
        return true;
      }
    }
  });
};

const isAwaitExpression = matches({
  'parent.parent.type': 'AwaitExpression',
});

const isHavingAsyncCallBackParam = matches({
  'params.0.type': 'Identifier',
});

module.exports = {
  meta: {
    docs: {
      url: getDocsUrl(__filename),
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.type === 'MemberExpression' &&
          isThenOrCatch(node) &&
          node.parent.type === 'CallExpression' &&
          !isAwaitExpression(node)
        ) {
          const testFunction = getTestFunction(node);
          if (testFunction && !isHavingAsyncCallBackParam(testFunction)) {
            const testFunctionBody = getFunctionBody(testFunction);
            const parent = node.parent;
            const fulfillmentCallback = parent.arguments[0];
            const rejectionCallback = parent.arguments[1];

            // then block can have two args, fulfillment & rejection
            // then block can have one args, fulfillment
            // catch block can have one args, rejection
            // ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
            verifyExpectWithReturn(
              [fulfillmentCallback, rejectionCallback],
              node,
              context,
              testFunctionBody
            );
          }
        }
      },
    };
  },
};
