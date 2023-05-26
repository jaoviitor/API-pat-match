const http = require('http');
const port = 3308 || 3000;
const server = http.createServer();

server.listen(port, () =>{
    console.log(`Server rodando na porta ${port}`);
});