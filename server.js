const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;

// Configure com seu access token de teste do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

app.use(cors());
app.use(express.json());

// Rotas da API
app.post('/api/create_preference', async (req, res) => {
  console.log('Rota /api/create_preference chamada!');
  console.log('Body recebido:', req.body);

  const { items } = req.body;
  const preference = new Preference(client);

  try {
    const result = await preference.create({
      body: {
        items,
        back_urls: {
          success: "https://projeto-mp-production.up.railway.app/sucesso.html",
          failure: "https://projeto-mp-production.up.railway.app/erro.html",
          pending: "https://projeto-mp-production.up.railway.app/pendente.html"
        }
      }
    });
    res.json({ init_point: result.init_point });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pedido', (req, res) => {
  const pedido = req.body;
  const pedidosPath = path.join(__dirname, 'pedidos.json');

  let pedidos = [];
  if (fs.existsSync(pedidosPath)) {
    pedidos = JSON.parse(fs.readFileSync(pedidosPath, 'utf8'));
  }
  pedidos.push(pedido);
  fs.writeFileSync(pedidosPath, JSON.stringify(pedidos, null, 2));
  res.status(201).json({ message: 'Pedido salvo com sucesso!' });
});

app.post('/api/cadastro', (req, res) => {
  const { nome, email, senha, endereco, cep } = req.body;
  const usuariosPath = path.join(__dirname, 'usuarios.json');
  let usuarios = [];
  if (fs.existsSync(usuariosPath)) {
    usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
  }
  if (usuarios.find(u => u.email === email)) {
    return res.status(400).json({ error: 'E-mail já cadastrado' });
  }
  const senhaHash = bcrypt.hashSync(senha, 10);
  usuarios.push({ nome, email, senha: senhaHash, endereco, cep });
  fs.writeFileSync(usuariosPath, JSON.stringify(usuarios, null, 2));
  res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
});

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const usuariosPath = path.join(__dirname, 'usuarios.json');
  if (!fs.existsSync(usuariosPath)) {
    return res.status(400).json({ error: 'Usuário não encontrado' });
  }
  const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
  const usuario = usuarios.find(u => u.email === email);
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
    return res.status(400).json({ error: 'E-mail ou senha inválidos' });
  }
  res.json({ message: 'Login realizado com sucesso!' });
});

app.get('/api/usuario_nome', (req, res) => {
  const email = req.query.email;
  const usuariosPath = path.join(__dirname, 'usuarios.json');
  if (!fs.existsSync(usuariosPath)) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
  const usuario = usuarios.find(u => u.email === email);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  res.json({ nome: usuario.nome });
});

// Só depois das rotas da API:
app.use(express.static('public'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
}); 