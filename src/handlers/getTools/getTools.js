"use strict";
const AWS = require("aws-sdk");

AWS.config.update({ region: "sa-east-1" });

exports.handler = async (event, context) => {
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
  const documentClient = new AWS.DynamoDB.DocumentClient({
    region: "sa-east-1",
  });

  let response = {
    statusCode: 0,
    headers: {
      myHeader: "test",
    },
    body: "",
  };

  let params = {
    TableName: process.env.tableName,
  };

  if (event.queryStringParameters && event.queryStringParameters.id !== null) {
    const { tag } = event.queryStringParameters;
    params.ScanFilter = {
      tags: {
        ComparisonOperator: "CONTAINS",
        AttributeValueList: [tag],
      },
    };
  }

  response = await scanData(documentClient, params, response).then();

  return response;
};

const scanData = async (documentClient, params, response) => {
  try {
    const data = await documentClient.scan(params).promise();
    const orderedData = orderData(data.Items);
    response.body = JSON.stringify(data.Items);
    response.statusCode = 200;
  } catch (err) {
    if (params.ScanFilter != null) {
      response.body = `Unable To Get Tools By Tag`;
    } else {
      response.body = `Unable To Get All Tools Data`;
    }
    response.statusCode = 403;
  }
  return response;
};

const orderData = (arr) => {
  let temp = null;
  for (let j = 0; j < arr.length; j++) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i].id > arr[i + 1].id) {
        temp = arr[i + 1];
        arr[i + 1] = arr[i];
        arr[i] = temp;
      }
    }
  }
  return arr;
};
