# Resolução do desafio AWS Software Engineer, Back-end - Mimoo - [Desafio](https://github.com/mimoo-tech/jobs/blob/master/desafios/backend/README.md)

# Requisitos Mínimos do Projeto

#### Uma aplicação contendo uma API real simples, com autenticação, que atenda os requisitos descritos abaixo, fazendo requisições à um banco de dados para persistência;

### Rotas:

- #### GET /tools - Rota para listar todas as ferramentas cadastradas

- #### GET /tools?tag=node - Rota para filtrar ferramentas por tag

- #### POST /tools Content-Type: application/json - Rota para cadastrar uma nova ferramenta

- #### DELETE /tools/:id - Rota para remover uma ferramenta por id

# Desenvolvimento

### Região

- Foi utilizada a região "sa-east-1", São Paulo, para o projeto.

### DynamoDB

- Todo o projeto foi desenvolvido utilizando-se a interface gráfica da AWS.
  Sendo assim, iniciou-se pela criação de uma Tabela no DynamoDB, MimooTableVUTTR, utilizando-se "id" como a partition key e as configurações padrões. Após isso, foram inseridos os 3 itens de exemplo na tabela pro meio da GUI.

### IAM - (Identity and Access Management)

- Foi criado um role para comunicação entre as funções Lambda e o DynamoDB com a política "AWSLambdaBasicExecutionRole" e adicionando a linha DynamoCRUD, a qual possui as permissões de CRUD mais utilizadas para um banco de dados. Temos como exemplo: Scan, PutItem, DeleteItem.

### Lambda

- Foram desenvolvidas 3 funções para todas as funcionalidades requeridas: "getTools", "deleteToolById", "createNewTool", todas as quais utilizaram como role o "AWSLambdaBasicExecutionRole". Após isso, foi feito o Deploy da API como "dev".

### API Gateway

- Foi criada uma REST API, "MimooToolsAPI", onde se criou um resource "/tools" com dois métodos, um GET (onde é recebida a lista de ferramentas da tabela do Dynamo) e um POST (utilizada para receber um JSON sem o parâmetro "id" e cadastrá-lo como uma nova ferramenta adicionando-o ao banco de dados já com seu novo "id") e, dentro de "/tools" foi criado um resource "/{id}" onde {id} é uma variável recebida como parâmetro de rota pela API, para que a mesma possa buscar pelo id e remover o item do banco de dados.

### Cognito

- Criou-se um User Pool, "MimooUserPool", com as configurações padrões, um App Client, "MimooClient". Em App Client Settings, selecinou-se "Cognito User Pool" e utilizou-se como Callback URL a URL da aplicação proveniente do API Gateway.

### API Gateway e Cognito

- Foi criado um Authorizer no API Gateway, "MimooAuth", do tipo Cognito, utilizando "MimooUserPool" e um Token Source "Authorization". Em cada um dos 3 métodos de utilização de funções para manipulação do banco de dados, foi utilizado Auth como "MimooAuth", para que seja necessário fornecer o "id_token" gerado ao se fazer o login pelo Cognito como Header da página.

# Funções Lambda

- Foram desenvolvidas as funções Lambda utilizando Javascript e Node.js 14.x

## getTools

- Função responsável pela requisição GET em "/tools". Verifica se há parâmetros de busca, se houver, pesquisa as tags referentes à busca. Se não houver, lista todas as ferramentas, retornando arrays com os objetos filtrados ou todos os objetos da tabela, respectivamente.

```javascript
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
    TableName: "MimooTableVUTTR",
  };

  // If there is query data, filter scan
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
    response.body = JSON.stringify(orderedData);
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
```

## createNewTool

- Função responsável pela requisição POST em "/tools" onde recebe como corpo da requisição um JSON com os parâmetros: "title", "link", "description", "tags" e cria um novo item na tabela do DynamoDB com estes parâmetros e seu novo "id", retornando o novo objeto, se bem sucedida.

```javascript
"use strict";
const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
const documentClient = new AWS.DynamoDB.DocumentClient({
  region: "sa-east-1",
});

AWS.config.update({ region: "sa-east-1" });

exports.handler = async (event, context) => {
  const tableName = "MimooTableVUTTR";
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
```

## deleteById

- Função responsável pela requisição DELETE em "/tools/:id". A função recebe o parâmetro de rota e deleta do banco de dados a ferramenta com o "id" fornecido, retornando um objeto vazio {} se bem sucedida.

```javascript
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
    TableName: "MimooTableVUTTR",
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
```

# Uso

Ao clonar no projeto certifique-se de que possui o Nodejs e o NPM devidamente instalados e utilize, dentro do diretório do projeto, o comando

```bash
npm install
```

Após isso, deve-se comentar os trechos referentes a autenticação e, assim, pode-se criar um novo projeto executando o comando

```bash
sls deploy
```

Posteriormente, deve-se descomentar os trechos de autenticação das funções, alterar o arn para o arn referente ao User Pool criado e repetir o comando

```bash
sls deploy
```

Ao entrar na [API](https://yvjmotzr7k.execute-api.sa-east-1.amazonaws.com/dev/), pode-se tentar utilizar as rotas, como exemplo "[/tools/](https://yvjmotzr7k.execute-api.sa-east-1.amazonaws.com/dev/tools/)", porém, será mostrada uma mensagem de erro, comprovando o funcionamento do Cognito para autenticação de usuário:

```json
{
  "message": "Unauthorized"
}
```

Sendo assim, é necessário [Registrar-se e efetuar Login](https://mimooauth.auth.sa-east-1.amazoncognito.com/login?client_id=382prkqppentjpf1mpv4jsldt1&response_type=code&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=https://www.mimoo.dev/), para, posteriormente, copiar o "id_token" da URL e utilizá-lo no [Postman](https://www.postman.com/) ou [Insomnia](https://insomnia.rest/), adicionar um Header "Authorization" com o valor de id_token.
Após isso, toda a aplicação funcionará sem problemas, com todas as rotas e funcionalidades requeridas pelo desafio, bem como mostrará que o processo de autenticação de usuário para utilização da API está funcionando.

### Autor - [André Cavalcante](https://andre94cavalcante.github.io/)
