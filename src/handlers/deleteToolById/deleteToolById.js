"use strict";
const AWS = require("aws-sdk");

AWS.config.update({ region: "sa-east-1" });

exports.handler = async (event, context) => {
  const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
  const documentClient = new AWS.DynamoDB.DocumentClient({
    region: "sa-east-1",
  });

  let responseBody = "";
  let statusCode = 0;

  const { id } = event.pathParameters;

  const params = {
    TableName: process.env.tableName,
    Key: {
      id: parseInt(id),
    },
  };

  try {
    const dataExists = await documentClient.get(params).promise();
    if (Object.keys(dataExists).length > 0) {
      const data = await documentClient.delete(params).promise();
      responseBody = JSON.stringify(data);
      statusCode = 200;
    } else {
      responseBody = `No Item With This ID`;
      statusCode = 403;
    }
  } catch (err) {
    responseBody = `Unable To Get Tool Data`;
    statusCode = 403;
  }

  const response = {
    statusCode: statusCode,
    headers: {
      myHeader: "test",
    },
    body: responseBody,
  };

  return response;
};
