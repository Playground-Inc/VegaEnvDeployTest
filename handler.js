"use strict";

const AWS = require("aws-sdk");
const Redis = require("ioredis");

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        API_GATEWAY: event.headers.host,
        X_FORWARDED_HOST: event.headers["x-forwarded-host"],
        DYNAMO_SFX: process.env.DYNAMO_SFX,
        BRANCH: process.env.BRANCH,
        REDIS_HOST: process.env.REDIS_HOST,
        REGION: process.env.REGION,
        PWD_SALT: process.env.PWD_SALT,
        SUB_DOMAIN: process.env.SUB_DOMAIN,
        SUB_DOMAIN_API: process.env.SUB_DOMAIN_API,
        HOST_AUTH: process.env.HOST_AUTH,
        HOST_ASSETS: process.env.HOST_ASSETS,
      },
      null,
      2
    ),
  };
};

module.exports.db = async (event) => {
  const dynClient = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION,
  });

  const newItem = {
    id_child: "BUK#123",
    name: "John",
    created: 123,
    app: "BUK",
  };

  const redisClient = new Redis({
    port: 6379,
    host: process.env.REDIS_HOST,
  });

  // Create child table
  await dynClient
    .put({
      TableName: "CHILDS" + process.env.DYNAMO_SFX,
      Item: newItem,
    })
    .promise();

  // Read child item
  const hrstartDyn = process.hrtime();
  const itemDynamo = await dynClient
    .get({
      TableName: "CHILDS" + process.env.DYNAMO_SFX,
      Key: { id_child: newItem.id_child },
      ConsistentRead: true,
    })
    .promise();
  const itemDynTime = process.hrtime(hrstartDyn);

  // Put on redis
  await redisClient.set("child", JSON.stringify(itemDynamo.Item));

  // Get from redis
  //start microsecond timer for redis
  const hrstart = process.hrtime();
  const itemRedis = JSON.parse(await redisClient.get("child"));
  const itemRedisTime = process.hrtime(hrstart);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        itemDynamo: itemDynamo.Item,
        getItemDynTime: itemDynTime[1] / 1000000000, // about 50ms
        itemRedis,
        getItemRedisTime: itemRedisTime[1] / 1000000000, // about 1ms
      },
      null,
      2
    ),
  };
};
