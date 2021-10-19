"use strict";
const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
const documentClient = new AWS.DynamoDB.DocumentClient({
  region: "sa-east-1",
});

AWS.config.update({ region: "sa-east-1" });

exports.handler = async (event, context) => {
  const tableName = process.env.tableName;
  let responseBody = "";
  let statusCode = 0;

  const getIdParams = {
    TableName: tableName,
  };

  const nextId = await getNextId(getIdParams).then();

  const toolJSON = JSON.parse(event.body);
  const { description, link, tags, title } = toolJSON;

  const putParams = {
    TableName: tableName,
    Item: {
      id: nextId,
      description: description,
      link: link,
      tags: tags,
      title: title,
    },
  };

  try {
    const putToolData = await documentClient.put(putParams).promise();
    responseBody = JSON.stringify(putParams.Item);
    statusCode = 201;
  } catch (err) {
    responseBody = `Unable To Create Tool`;
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

const getNextId = async (params) => {
  let lastId = -1;

  try {
    const data = await documentClient.scan(params).promise();
    if (data.Items.length > 0) {
      const orderedData = orderData(data.Items);
      lastId = orderedData[orderedData.length - 1].id;
    } else {
      lastId = 0;
    }
  } catch (err) {
    lastId = `Unable To Get Tools IDs`;
  }

  return lastId + 1;
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
