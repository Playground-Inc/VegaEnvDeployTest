"use strict";

import { DynamoDB } from "aws-sdk";
import { createClient } from "redis";

exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        API_GATEWAY: event.headers.host,
        X_FORWARDED_HOST: event.headers["x-forwarded-host"],
        DYNAMO_SFX: process.env.DYNAMO_SFX,
        BRANCH: process.env.BRANCH,
        //REDIS_CLUSTER_ENDPOINT: process.env.REDIS_CLUSTER_ENDPOINT,
        MEMORY_DB_ENDPOINT: process.env.MEMORY_DB_ENDPOINT,
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

exports.helloAuth = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        API_GATEWAY: event.headers.host,
        X_FORWARDED_HOST: event.headers["x-forwarded-host"],
        X_IS_HOSTING_PROVIDER:
          event.headers["x-amzn-waf-is-hosting-provider"] || "0",
        X_IS_BOT: event.headers["x-amzn-waf-is-bot"] || "0",
        X_IS_ANON_IP: event.headers["x-amzn-waf-is-anon-ip"] || "0",
        CLOUDFRONT_VIEWER_CITY: event.headers["cloudfront-viewer-city"],
        CLOUDFRONT_VIEWER_COUNTRY: event.headers["cloudfront-viewer-country"],
        CLOUDFRONT_VIEWER_COUNTRY_REGION:
          event.headers["cloudfront-viewer-country-region"],
        CLOUDFRONT_VIEWER_LATITUDE: event.headers["cloudfront-viewer-latitude"],
        CLOUDFRONT_VIEWER_LONGITUDE:
          event.headers["cloudfront-viewer-longitude"],
        CLOUDFRONT_VIEWER_TIME_ZONE:
          event.headers["cloudfront-viewer-time-zone"],
        DYNAMO_SFX: process.env.DYNAMO_SFX,
        BRANCH: process.env.BRANCH,
        //REDIS_CLUSTER_ENDPOINT: process.env.REDIS_CLUSTER_ENDPOINT,
        MEMORY_DB_ENDPOINT: process.env.MEMORY_DB_ENDPOINT,
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

exports.db = async () => {
  try {
    const dynClient = new DynamoDB.DocumentClient({
      region: process.env.REGION,
    });

    const newItem = {
      id_child: "BUK#123",
      name: "John",
      created: 123,
      app: "BUK",
    };

    const redisClient = createClient({
      socket: {
        host: process.env.MEMORY_DB_ENDPOINT,
        tls: true,
        port: 6379,
      },
      username: "default",
      password: process.env.MEMORY_DB_PWD,
    });
    await redisClient.connect();

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
    // Best practice for perf: encode in json as we dont need to parse it and get specific fields
    // https://stackoverflow.com/questions/16375188/redis-strings-vs-redis-hashes-to-represent-json-efficiency
    await redisClient.set("child:100000", JSON.stringify(itemDynamo));

    // Get from redis
    const hrstart = process.hrtime();
    const itemRedis = JSON.parse(
      (await redisClient.get("child:100000")) as string
    );
    const itemRedisTime = process.hrtime(hrstart);

    // Leaderboard
    // Loop to set 10000 participants
    const hrstartSetPerfAdd = process.hrtime();
    let parts = [];
    for (let i = 1; i <= 10000; i++) {
      parts.push({
        score: i, // Votes
        value: "part" + i,
      });
    }

    await redisClient.zAdd("contest:455", parts));

    const setPerfAdd = process.hrtime(hrstartSetPerfAdd);

    // Search rank for part 5000
    const getRankStart = process.hrtime();
    const rank = await redisClient.zRank("contest:455", "part5000");
    const getRankPerf = process.hrtime(getRankStart);

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          itemDynamo: itemDynamo.Item,
          getItemDynTime: itemDynTime[1] / 1000000000, // about 50ms
          itemRedis,
          getItemRedisTime: itemRedisTime[1] / 1000000000, // about 1/2ms
          add10000parts: setPerfAdd[1] / 1000000000, // about 10-20ms
          rank: rank,
          getRankPerf: getRankPerf[1] / 1000000000, // about 1/2ms
        },
        null,
        2
      ),
    };
  } catch (e) {
    return {
      statusCode: 200,
      body: { message: e.message.toString(), e: e },
    };
  }
};
