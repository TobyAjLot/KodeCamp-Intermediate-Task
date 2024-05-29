const http = require('node:http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const qs = require('querystring');
const authMiddleware = require('./auth');

const hostname = '127.0.0.1';
const port = 3000;

let memories = [];

function loadMemories() {
  const filePath = path.join(__dirname, 'memory.json');
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading memory.json file');
      return;
    }
    try {
      memories = JSON.parse(data);
      console.log('Memories loaded successfully');
    } catch (err) {
      console.error('Error parsing memory.json file:', err);
    }
  });
}

function handleRequest(req, res, ...handlers) {
  function handler(index) {
    const currentHandler = handlers[index];
    if (index < handlers.length) {
      currentHandler(req, res, () => handler(index + 1));
    } else {
      console.log(
        `
        All handlers executed. 
        Why did you call the next function? 
        Explain yourself.
        `
      );
    }
  }
  handler(0);
}

function homepageHandler(req, res) {
  const homepageContent = `
    <html>
      <head>
        <title>Memories</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .memory { margin-bottom: 1em; }
          .text-area { margin-bottom: 0.5em; }
        </style>
      </head>
      <body>
        <h1>Memories</h1>
        <form action="/create-memory" method="post">
          <textarea class="text-area" name="content" rows="4" cols="50" placeholder="Write you new memory here"></textarea>
          <br>
          <button type="submit">Add Memory</button>
        </form>
        <ul>
          ${memories
            .map((memory, index) => {
              const truncatedContent =
                memory.content.length > 100
                  ? memory.content.slice(0, 100) + '...'
                  : memory.content;
              return `<li class="memory"><strong>${
                index + 1
              }:</strong> ${truncatedContent} <a href="/memory/${
                memory.id
              }">Read More</a></li>`;
            })
            .join('')}
        </ul>
      </body>
    </html>
  `;
  res.writeHead(200, { 'Content-Type': 'text/html' }).end(homepageContent);

  /* Sending a JSON response */
  // res.writeHead(200, { 'Content-Type': 'application/json' });
  // res.end(JSON.stringify(memories));
}

function memorypageHandler(req, res) {
  const id = parseInt(req.url.split('/')[2], 10); // takes the third item in the split array result (expected to be the id) and parse it using base10

  if (isNaN(id)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid memory ID' }));
    return;
  }

  const memory = memories.find((memory) => memory.id === id);
  const memorypageContent = `
    <html>
      <head>
        <title>Memories</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .memory { margin-bottom: 1em; }
        </style>
      </head>
      <body>
        <h1>Memory</h1>
        <p class="memory">${memory.content}</p>
        <a href="/">Back to homepage</a>
      </body>
    </html>
  `;
  res.writeHead(200, { 'Content-Type': 'text/html' }).end(memorypageContent);

  /* Sending a JSON response */
  // res.writeHead(200, { 'Content-Type': 'application/json' });
  // res.end(JSON.stringify(memory));
}

function createNewMemory(req, res) {
  let body = '';

  // Collect data from the form submission
  req.on('data', (chunk) => {
    body += chunk.toString();
    // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
    if (body.length > 1e6) {
      body = '';
      res.writeHead(413, { 'Content-Type': 'text/plain' }).end();
      req.connection.destroy();
    }
  });

  // Once all data is received, parse and process it
  req.on('end', () => {
    const requestBody = qs.parse(body);
    const newMemoryContent = requestBody.content;

    if (newMemoryContent) {
      const newMemory = {
        id: memories.length ? memories[memories.length - 1].id + 1 : 1,
        content: newMemoryContent,
      };
      memories.push(newMemory);

      // Optionally save the new memory to the memory.json file
      fs.writeFile(
        path.join(__dirname, 'memory.json'),
        JSON.stringify(memories, null, 2),
        (err) => {
          if (err) {
            console.error('Error saving memory:', err);
          }
        }
      );

      res.writeHead(302, { Location: '/' });
      res.end();
    } else {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>400 Bad Request</h1><p>Memory content is required.</p>');
    }
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url, true);

  if (req.url === '/' && req.method === 'GET') {
    handleRequest(req, res, authMiddleware, homepageHandler);
  } else if (reqUrl.pathname.startsWith('/memory/') && req.method === 'GET') {
    handleRequest(req, res, authMiddleware, memorypageHandler);
  } else if (req.url === '/create-memory' && req.method === 'POST') {
    handleRequest(req, res, authMiddleware, createNewMemory);
  } else {
    res
      .writeHead(404, { 'Content-Type': 'text/html' })
      .end('<h1>404 Not Found</h1>');
  }
});

loadMemories();

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
