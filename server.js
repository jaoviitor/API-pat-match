const http = require('http');
const app = require('./app');
const port = 3308 || 3000;
const server = http.createServer(app);

server.listen(port, () =>{
    console.log(`Server rodando na porta ${port}`);
});