const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fetch = require('node-fetch');

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'public', 'imgs');
    // Cria o diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Gera um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'produto-' + uniqueSuffix + ext);
  }
});

const fileFilter = function (req, file, cb) {
  // Aceita apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

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

const produtosPath = path.join(__dirname, 'produtos.json');

// Rota para cadastrar produto (admin)
app.post('/api/admin/produto', (req, res) => {
  const produto = req.body;
  const produtosPath = path.join(__dirname, 'produtos.json');
  let produtos = [];
  if (fs.existsSync(produtosPath)) {
    produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
  }
  // Gera ID único
  produto.id = produtos.length > 0 ? Math.max(...produtos.map(p => p.id || 0)) + 1 : 1;
  produtos.push(produto);
  fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
  res.status(201).json({ message: 'Produto cadastrado com sucesso!' });
});

// Rota para remover produto (admin)
app.delete('/api/admin/produto/:id', (req, res) => {
  const id = Number(req.params.id);
  const produtosPath = path.join(__dirname, 'produtos.json');
  let produtos = [];
  if (fs.existsSync(produtosPath)) {
    produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
  }
  const novoArray = produtos.filter(p => p.id !== id);
  if (novoArray.length === produtos.length) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  fs.writeFileSync(produtosPath, JSON.stringify(novoArray, null, 2));
  res.json({ message: 'Produto removido com sucesso!' });
});

// Rota para listar todos os produtos
app.get('/api/produtos', (req, res) => {
  const produtosPath = path.join(__dirname, 'produtos.json');
  let produtos = [];
  if (fs.existsSync(produtosPath)) {
    produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
  }
  res.json(produtos);
});

// Rota para atualizar o estoque de um produto
app.post('/api/produtos/estoque', (req, res) => {
  const { id, novoEstoque } = req.body;
  const produtosPath = path.join(__dirname, 'produtos.json');
  let produtos = [];
  if (fs.existsSync(produtosPath)) {
    produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
  }
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  produtos[idx].estoque = novoEstoque;
  fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
  res.json({ message: 'Estoque atualizado com sucesso!' });
});

// Rota para editar produto (admin)
app.put('/api/admin/produto/:id', (req, res) => {
  const id = Number(req.params.id);
  const produtoEditado = req.body;
  const produtosPath = path.join(__dirname, 'produtos.json');
  let produtos = [];
  if (fs.existsSync(produtosPath)) {
    produtos = JSON.parse(fs.readFileSync(produtosPath, 'utf8'));
  }
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  produtos[idx] = { ...produtos[idx], ...produtoEditado, id };
  fs.writeFileSync(produtosPath, JSON.stringify(produtos, null, 2));
  res.json({ message: 'Produto atualizado com sucesso!' });
});

// Rota para upload de imagem
app.post('/api/upload-imagem', upload.single('imagem'), (req, res) => {
  console.log('Upload de imagem solicitado');
  console.log('req.file:', req.file);
  
  if (!req.file) {
    console.log('Erro: Nenhum arquivo enviado');
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  
  try {
    // Retorna a URL relativa para uso no front-end
    const url = '/imgs/' + req.file.filename;
    console.log('URL retornada:', url);
    
    res.json({ url });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno no servidor: ' + error.message });
  }
});

// ROTA DE PAGAMENTO TRANSPARENTE (Checkout Custom)
app.post('/api/pagar', async (req, res) => {
  const { token, email, valor, identificationNumber } = req.body;
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        transaction_amount: valor,
        token,
        description: 'Compra na Matéria Prima Triunfo',
        installments: 1,
        payment_method_id: 'visa', // ou detecte dinamicamente
        payer: {
          email,
          identification: {
            type: 'CPF',
            number: identificationNumber
          }
        }
      })
    });
    const payment = await response.json();
    if (!response.ok) {
      // Repasse todos os detalhes do erro para o frontend
      return res.status(response.status).json({
        error: payment.error || payment.message || 'Erro desconhecido',
        cause: payment.cause || null,
        status: payment.status || response.status
      });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro inesperado no servidor.' });
  }
});

// Middleware para tratar erros do multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Erro do Multer:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' });
    }
    return res.status(400).json({ error: 'Erro no upload: ' + error.message });
  }
  
  if (error.message === 'Apenas arquivos de imagem são permitidos!') {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

// Só depois das rotas da API:
app.use(express.static('public'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 