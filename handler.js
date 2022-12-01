"use strict";

// const { DynamoDB } = require("serverless-dynamodb-client");
// var AWS = require("aws-sdk");
// const client = new AWS.DynamoDB({
//   region: "localhost",
//   endpoint: "http://localhost:8001",
//   // accessKeyId: "DEFAULT_ACCESS_KEY", // needed if you don't have aws credentials at all in env
//   // secretAccessKey: "DEFAULT_SECRET", // needed if you don't have aws credentials at all in env
// });

module.exports.hello = async (event) => {
  //const tables = await client.listTables().promise();

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: "Go Serverless v3.0!!",
        //input: event,
        REDIS_HOST: process.env.REDIS_HOST,
        DYNAMO_SFX: process.env.DYNAMO_SFX,
        BRANCH: process.env.BRANCH,
        SUB_DOMAIN: process.env.SUB_DOMAIN,
        SUB_DOMAIN_API: process.env.SUB_DOMAIN_API,
        // TABLES: tables,
      },
      null,
      2
    ),
  };
};
