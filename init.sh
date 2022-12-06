#!/usr/bin/env bash
BRANCH=$(git branch | grep '^*' | sed 's/* //' )
STAGE=${BRANCH/\//-}

if [ $BRANCH == "main" ] || [ $BRANCH == "prod" ]
then
  STAGE="prod"
  CREATE_DB=true
  CREATE_CACHE_CLUSTER=true
  CREATE_BUCKET=true
  AWS_PROFILE=prod
elif [ $BRANCH == "preprod" ]
then
  CREATE_DB=true
  CREATE_CACHE_CLUSTER=true
  CREATE_BUCKET=true
  AWS_PROFILE=prod
elif [ $BRANCH == "dev" ]
then
  CREATE_DB=true
  CREATE_CACHE_CLUSTER=true
  CREATE_BUCKET=true
  AWS_PROFILE=dev
else
  AWS_PROFILE=dev
  read -p "Do you want to create new DynamoDb database? [y/N] " CREATE_DB
  if [[ $CREATE_DB =~ ^[Yy]$ ]]
  then
    CREATE_DB=true
  else
    CREATE_DB=false
  fi

  read -p "Do you want to create new Elasticache Redis cluster? [y/N] " CREATE_CACHE_CLUSTER

  if [[ $CREATE_CACHE_CLUSTER =~ ^[Yy]$ ]]
  then
    CREATE_CACHE_CLUSTER=true
  else
    CREATE_CACHE_CLUSTER=false
  fi

  read -p "Do you want to create new S3 bucket? [y/N] " CREATE_BUCKET

  if [[ $CREATE_BUCKET =~ ^[Yy]$ ]]
  then
    CREATE_BUCKET=true
  else
    CREATE_BUCKET=false
  fi
fi

echo "All set for $BRANCH!"
echo "BRANCH: $BRANCH
STAGE: $STAGE
CREATE_DB: $CREATE_DB
CREATE_CACHE_CLUSTER: $CREATE_CACHE_CLUSTER
CREATE_BUCKET: $CREATE_BUCKET
AWS_PROFILE: $AWS_PROFILE" > .serverlessEnv.yml