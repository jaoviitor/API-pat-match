const express = require('express');
const router = express.Router();
const mysql = require('../mysql').pool;
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();
const nodemailer = require('nodemailer');
const moment = require('moment');

//RETORNA TODOS OS USUÁRIOS
router.get('/', (req, res, next) =>{
    mysql.getConnection((error, conn) =>{
        if(error){ return res.status(500).send({ error: error }) };
        conn.query(
            'SELECT * FROM Usuario;',
            (error, resultado, fields) =>{
                conn.release();
                if(error){ return res.status(500).send({ error: error }) };
                return res.status(200).send({response: resultado});
            }
        )
    })
});

//RETORNA UM USUÁRIO ESPECÍFICO
router.get('/:Id_Usuario', (req, res, next) =>{
    mysql.getConnection((error, conn) =>{
        if(error){ return res.status(500).send({ error: error }) };
        conn.query(
            'SELECT * FROM Cliente WHERE Id_Usuario = ?;',
            [req.params.Id_Usuario],
            (error, resultado, fields) =>{
                conn.release();
                if(error){ return res.status(500).send({ error: error }) };
                return res.status(200).send({response: resultado});
            }
        )
    })
});

//CADASTRA UM USUARIO NOVO
router.post('/cadastro', (req, res, next) => {
    mysql.getConnection((error, conn) =>{
        if(error){ return res.status(500).send({ error: error }) };
        conn.query('SELECT * FROM Usuario WHERE Email = ?', [req.body.Email], (error, results) =>{
            if(error) { return res.status(500).send({ error: error })}
            if(results.length > 0) {
                res.status(409).send({ mensagem: 'Usuario já cadastrado' })
            } else{
                bcrypt.hash(req.body.Senha, 10, (errBcrypt, hash) =>{
                    if (errBcrypt) { return res.status(500).send({ error: errBcrypt }) }
                    conn.query(`INSERT INTO Usuario (Nome, Endereco, Dt_Nascimento, Genero, Email, Senha) VALUES (?,?,?,?,?,?)`,
                    [req.body.Nome, req.body.Endereco, req.body.Dt_Nascimento, req.body.Genero, req.body.Email, hash],
                    (error, results) =>{
                        conn.release();
                        if (error) { return res.status(500).send({ error: error })}
                        res.status(201).send({
                            mensagem: 'Usuario cadastrado com sucesso!'
                        })
                    })
                })
            }
        })
    })
});

//LOGIN
router.post('/login', (req, res, next) =>{
    mysql.getConnection((error, conn) =>{
        if (error) { return res.status(500).send({ error: error }) }
        const query = `SELECT * FROM Usuario WHERE Email = ?`;
        conn.query(query,[req.body.Email], (error, results, fields) =>{
            conn.release();
            const dataRecebida = results[0].Dt_Nascimento;
            const dataFormatada = moment(dataRecebida).format('DD/MM/YYYY');
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length < 1){ //conferindo se o email está no banco
                return res.status(401).send({ mensagem: 'Falha na autenticação' });
            }
            bcrypt.compare(req.body.Senha, results[0].Senha, (err, result) =>{ //comparando a senha com o hash
                if (err){
                    return res.status(401).send({ mensagem: 'Falha na autenticação' });
                }
                if (result){ //gerando o token
                    const token = jwt.sign({
                        Id_Usuario: results[0].Id_Usuario,
                        email: results[0].Email
                    }, 
                    process.env.JWT_KEY,
                    {
                        expiresIn: "1h"
                    })
                    return res.status(200).send({
                        mensagem: 'Autenticado com sucesso',
						Nome: results[0].Nome,
                        Endereco: results[0].Endereco,
                        Dt_Nascimento: dataFormatada,
                        Genero: results[0].Genero,
						Email: results[0].Email,
                        token: token
                    });
                }
                return res.status(401).send({ mensagem: 'Falha na autenticação' });
            })
        })
    })
})

//RECUPERAR SENHA
router.post('/recuperarsenha', (req, res, next) =>{
    mysql.getConnection((error, conn) =>{
        if (error) { return res.status(500).send({ error: error }) }
        const query = `SELECT * FROM Usuario WHERE Email = ?`;
        conn.query(query,[req.body.Email], (error, results, fields) =>{
            conn.release();
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length < 1){ //conferindo se o email está no banco
                return res.status(401).send({ mensagem: 'Este email não está cadastrado' });
            }
            const prefixo = 'PET';
            const ramdomNum = crypto.randomInt(1000, 9999);
            const key = prefixo + ramdomNum;
            const now = new Date();
            now.setHours(now.getHours() + 1); //Setando tempo de expiração do token
            conn.query(`UPDATE Usuario SET SenhaResetToken = ?, SenhaResetExpires = ? WHERE Email = ?`,
                    [key, now, req.body.Email],
                    (error, results) =>{
                        conn.release();
                        const transporter = nodemailer.createTransport({
                            host: process.env.HOST_MAIL,
                            port: process.env.HOST_PORT,
                            auth: {
                                user: process.env.HOST_USER,
                                pass: process.env.HOST_PASS
                            }
                        });
                        const sender = {
                            name: 'PetMatch',
                            email: 'joao.vitor.dev@outlook.com'
                        }
                        const receiver = {
                            email: req.body.Email
                        }
                        const mailContent = {
                            subject: 'Recuperação de senha',
                            text: `Para recuperar sua senha, digite este token na página de redefinição: ${key}`,
                            html: `<h1>Recupere sua senha inserindo o token na página de recuperação </h1> <p>${key}</p>`
                        }

                        async function sendMail(transporter, sender, receiver, mailContent){
                            const mail = await transporter.sendMail({
                                from: `"${sender.name}" ${sender.email}`,
                                to: `${receiver.email}`,
                                subject: `${mailContent.subject}`,
                                text: `${mailContent.text}`,
                                html: `${mailContent.html}`
                            });

                            console.log('Email enviado: ', mail.messageId);
                            console.log('URL do Ethereal: ', nodemailer.getTestMessageUrl(mail));
                        }

                        async function mail(){
                            try{
                                await sendMail(transporter, sender, receiver, mailContent);
                            } catch(error){
                                console.log(error);
                            }
                        }

                        mail();
                        
                        if (error) { return res.status(500).send({ error: error })}
                        res.status(201).send({
                            mensagem: 'Operação realizada com sucesso!'
                        })
                    })
        })
    })
})

//TROCAR SENHA NO BANCO
router.post('/trocarsenha', (req, res, next) =>{
    mysql.getConnection((error, conn) =>{
        if (error) { return res.status(500).send({ error: error }) }
        const query = `SELECT * FROM Usuario WHERE SenhaResetToken = ?`;
        conn.query(query,[req.body.SenhaResetToken], (error, results, fields) =>{
            conn.release();
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length < 1){ //conferindo se o token está no banco
                return res.status(401).send({ mensagem: 'Token inválido' });
            }
            return res.status(201).send({mensagem: 'autenticado com sucesso'});
        })
    })
})


module.exports = router;