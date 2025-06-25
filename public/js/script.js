// js/script.js

document.addEventListener('DOMContentLoaded', () => {
  // ======= DEFINIÇÃO DE ADMIN (DEVE VIR PRIMEIRO) =======
  window.isAdmin = localStorage.getItem('isAdmin') === 'true';
  
  // ======= LÓGICA DO CARRINHO =======
  let carrinho = [];
  let total = 0;

  // Carrega carrinho do localStorage, se existir
  if (localStorage.getItem('carrinho')) {
    try {
      carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
      total = parseFloat(localStorage.getItem('carrinho_total')) || 0;
    } catch {
      carrinho = [];
      total = 0;
    }
  }

  function salvarCarrinho() {
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    localStorage.setItem('carrinho_total', total.toString());
  }

  window.adicionarAoCarrinho = (produto, preco) => {
    carrinho.push({ produto, preco });
    total += preco;
    salvarCarrinho();
    atualizarCarrinho();
  };

  function atualizarCarrinho() {
    const lista   = document.getElementById('lista-carrinho');
    const totalEl = document.getElementById('total');
    const qtdEl   = document.getElementById('quantidade-carrinho');
    if (!lista || !totalEl || !qtdEl) return;

    lista.innerHTML = '';
    carrinho.forEach((item, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${item.produto} — R$ ${item.preco.toFixed(2)}
        <button onclick="removerItem(${i})">Remover</button>
      `;
      lista.appendChild(li);
    });

    totalEl.innerText = `R$ ${total.toFixed(2)}`;
    qtdEl.innerText   = carrinho.length;
  }

  window.removerItem = i => {
    total -= carrinho[i].preco;
    carrinho.splice(i, 1);
    salvarCarrinho();
    atualizarCarrinho();
  };

  window.abrirCarrinho = () => {
    document.getElementById('carrinho')?.classList.add('aberto');
  };

  window.fecharCarrinho = () => {
    document.getElementById('carrinho')?.classList.remove('aberto');
  };

  // ======= BOTÃO DE CHECKOUT =======
  const btnCheckout = document.getElementById('btn-checkout');
  if (btnCheckout) {
    btnCheckout.addEventListener('click', async () => {
      if (carrinho.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
      }
      // Salva o valor total do carrinho no localStorage
      localStorage.setItem('checkout_total', total.toString());
      // Redireciona para o checkout transparente
      window.location.href = 'checkout.html';
    });
  }

  // ======= LÓGICA DE FILTRO =======
  window.filtrarCategoria = categoria => {
    document.querySelectorAll('.card[data-categoria]').forEach(card => {
      card.style.display =
        categoria === 'todos' || card.dataset.categoria === categoria
          ? ''
          : 'none';
    });
  };

  document.querySelectorAll('button[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      filtrarCategoria(btn.dataset.filter);
    });
  });

  const sel = document.getElementById('categoria-select');
  if (sel) {
    sel.addEventListener('change', () => {
      filtrarCategoria(sel.value);
    });
  }

  // Atualiza carrinho ao carregar a página
  atualizarCarrinho();

  window.abrirProduto = function(id) {
    window.location.href = `produto.html?id=${id}`;
  };

  // ======= LISTAGEM AUTOMÁTICA DE PRODUTOS =======
  async function carregarProdutos() {
    console.log('carregarProdutos chamada');
    console.log('window.isAdmin:', window.isAdmin);
    
    const grid = document.getElementById('grid-produtos');
    if (!grid) return;
    grid.innerHTML = '<p>Carregando produtos...</p>';
    try {
      const res = await fetch('/api/produtos');
      const produtos = await res.json();
      if (!Array.isArray(produtos) || produtos.length === 0) {
        grid.innerHTML = '<p>Nenhum produto cadastrado.</p>';
        return;
      }
      grid.innerHTML = '';
      produtos.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('data-categoria', produto.categoria || 'outros');
        card.setAttribute('data-id', produto.id);
        
        const adminButtons = window.isAdmin ? `<button onclick="editarProduto(${produto.id});event.stopPropagation();" style="background:#FFD700;color:#000;margin-top:6px;">Editar</button>
          <button onclick="removerProduto(${produto.id});event.stopPropagation();" style="background:#c00;color:#fff;margin-top:6px;">Remover</button>
          <button onclick="alterarEstoque(${produto.id});event.stopPropagation();" style="background:#FFD700;color:#000;margin-top:6px;">Alterar Estoque</button>` : '';
        
        console.log(`Produto ${produto.id}: adminButtons = ${adminButtons ? 'SIM' : 'NÃO'}`);
        
        card.innerHTML = `
          <img src="${produto.imagem}" alt="${produto.nome}">
          <h3>${produto.nome}</h3>
          <p>${produto.descricao || ''}</p>
          <span>R$ ${produto.preco ? produto.preco.toFixed(2) : '0,00'}</span>
          <div>Estoque: <span id="estoque-${produto.id}">${produto.estoque ?? 0}</span></div>
          <button onclick="adicionarAoCarrinho('${produto.nome}', ${produto.preco})">Adicionar</button>
          ${adminButtons}
        `;
        card.onclick = function(e) {
          // Evita conflito do clique dos botões admin
          if (e.target.tagName === 'BUTTON' && window.isAdmin) return;
          abrirProduto(produto.id);
        };
        grid.appendChild(card);
      });
    } catch (err) {
      grid.innerHTML = '<p>Erro ao carregar produtos.</p>';
    }
  }

  window.alterarEstoque = async function(id) {
    const novoEstoque = prompt('Digite o novo estoque:');
    if (novoEstoque === null) return;
    const n = Number(novoEstoque);
    if (isNaN(n) || n < 0) {
      alert('Valor inválido!');
      return;
    }
    try {
      const res = await fetch('/api/produtos/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, novoEstoque: n })
      });
      if (!res.ok) throw new Error('Erro ao atualizar estoque');
      document.getElementById('estoque-' + id).innerText = n;
      alert('Estoque atualizado!');
    } catch {
      alert('Erro ao atualizar estoque!');
    }
  };

  window.removerProduto = async function(id) {
    if (!confirm('Tem certeza que deseja remover este produto?')) return;
    try {
      const res = await fetch('/api/admin/produto/' + id, { method: 'DELETE' });
      if (res.ok) {
        alert('Produto removido!');
        // Recarrega a página para atualizar a lista
        window.location.reload();
      } else {
        alert('Erro ao remover produto.');
      }
    } catch {
      alert('Erro ao remover produto.');
    }
  };

  // Chama o carregamento dos produtos ao abrir a página de produtos ou index
  if (window.location.pathname.endsWith('produtos.html') || window.location.pathname.endsWith('index.html')) {
    carregarProdutos();
  }

  // Renderiza o botão de cadastro de produto para admin na página de produtos
  function renderBotaoAdminProdutos() {
    console.log('renderBotaoAdminProdutos chamada');
    console.log('window.isAdmin:', window.isAdmin);
    console.log('pathname:', window.location.pathname);
    
    if (window.location.pathname.endsWith('produtos.html') && window.isAdmin) {
      const el = document.getElementById('admin-cadastrar-produto');
      if (el) {
        el.innerHTML = `<button style='background:#FFD700;color:#181818;font-weight:bold;padding:12px 24px;border-radius:6px;margin:18px 0 18px 0;cursor:pointer;font-size:17px;border:none;' onclick="window.location.href='admin.html'">Cadastrar Produto</button>`;
        console.log('Botão admin renderizado');
      } else {
        console.log('Elemento admin-cadastrar-produto não encontrado');
      }
    } else {
      console.log('Não renderizando botão admin:', {
        isProdutosPage: window.location.pathname.endsWith('produtos.html'),
        isAdmin: window.isAdmin
      });
    }
  }
  
  // Chama a renderização do botão admin imediatamente
  renderBotaoAdminProdutos();

  // Remover mensagem de nenhum produto cadastrado na index.html
  const grid = document.getElementById('grid-produtos');
  if (window.location.pathname.endsWith('index.html') && grid) {
    const observer = new MutationObserver(() => {
      if (grid.textContent.includes('Nenhum produto cadastrado.')) {
        grid.innerHTML = '';
      }
    });
    observer.observe(grid, { childList: true, subtree: true });
  }

  window.logout = function() {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('usuario');
    localStorage.removeItem('usuario_nome');
    window.location.reload();
  };

  window.editarProduto = function(id) {
    console.log('editarProduto chamada com ID:', id);
    console.log('window.isAdmin:', window.isAdmin);
    // Redireciona para admin.html já em modo edição
    window.location.href = `admin.html?edit=${id}`;
  };
});
