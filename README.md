### Backend Development – Coding Challenge

‘Simple Bank’ wants to extend its feature capabilities and support money transfers
between 2 accounts. The current database schema for the accounts table is the
```
account_id (PK) UUID
balance DECIMAL
updated_at TIMESTAMP
```

Your task is to design and implement
- an API for retrieving the current balance for a specific account
- an API for the horizontally scalable accounts microservice that transfers money from account A to account B.

Automated tests are required in order to prove the correctness of the provided

#### Tech Stack:

- typescript/node.js (extra points for using nest.js and graphql)
- any relational database (postgres/mysql etc.)
- docker compose

#### Extra points if:

- the benefits and drawbacks of the provided and alternative
- solutions are extend schema and API in order to support EUR and USD currencies

#### Notes:

- If needed the schema can be changed in order to support the new feature.


Please submit your solution to coding.challenge@unleashedcapital.com.
Feel free
to contact us if you have any questions.


## Solution

Using
- Nest.js
- PostgreSql
- RabbitMQ

Implemented Saga pattern. 
Event-driven architecture. 
To horizontally scale it's possible to run several replicas of this service

#### Running
```sh
mkdir unleashedcapital
cd unleashedcapital
git clone git@github.com:dmitriysolovyev/uc.git
cd uc
docker-compose build
docker-compose up
```

#### Running tests
```sh
docker-compose -f docker-compose.test.yml up
```

## Postman
Postman collections with examples of requests `postman_collection.json.md`