const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fetch = require('node-fetch');
const cloudinary = require('cloudinary').v2;

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

cloudinary.config({
  cloud_name: 'dtluzzo0x',
  api_key: '218866377958176',
  api_secret: 'dTy5QY2HaqR77ouIDZcrwurraQk'
});

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

// Rota para upload de imagem usando Cloudinary
app.post('/api/upload-imagem', upload.single('imagem'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  try {
    // Envia o arquivo para o Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'produtos' // opcional: cria uma pasta no Cloudinary
    });
    // Retorna a URL segura da imagem
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao enviar imagem para o Cloudinary' });
  }
});

// Rota para pagamento com Mercado Pago (real)
app.post('/api/pagar', async (req, res) => {
  const { token, email, valor, identificationNumber } = req.body;

  if (!token || !email || !valor || !identificationNumber) {
    return res.status(400).json({ error: 'Dados incompletos para pagamento.' });
  }

  try {
    const payment = new Payment(client);
    const result = await payment.create({
      body: {
        transaction_amount: Math.round((Number(valor) + Number.EPSILON) * 100) / 100,
        token: token,
        description: "Compra na loja Projeto MP",
        installments: 1,
        payment_method_id: undefined, // O Mercado Pago detecta automaticamente pelo token
        payer: {
          email: email,
          identification: {
            type: "CPF",
            number: identificationNumber
          }
        }
      }
    });
    res.json({
      status: result.status,
      status_detail: result.status_detail,
      id: result.id,
      message: result.status === "approved" ? "Pagamento aprovado!" : "Pagamento não aprovado.",
      raw: result
    });
  } catch (error) {
    console.error('Erro no pagamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar pagamento.' });
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