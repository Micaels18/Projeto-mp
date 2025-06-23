
document.addEventListener('DOMContentLoaded', () => {
  // ======= LÓGICA DO CARRINHO =======
  let carrinho = [];
  let total = 0;

  window.adicionarAoCarrinho = (produto, preco) => {
    carrinho.push({ produto, preco });
    total += preco;
    atualizarCarrinho();
  };

  const atualizarCarrinho = () => {
    const lista       = document.getElementById('lista-carrinho');
    const totalEl     = document.getElementById('total');
    const quantidade  = document.getElementById('quantidade-carrinho');

    lista.innerHTML = '';
    carrinho.forEach((item, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${item.produto} — R$ ${item.preco.toFixed(2)}
        <button onclick="removerItem(${i})">Remover</button>
      `;
      lista.appendChild(li);
    });

    totalEl.innerText    = `R$ ${total.toFixed(2)}`;
    quantidade.innerText = carrinho.length;
  };

  window.removerItem = (i) => {
    total -= carrinho[i].preco;
    carrinho.splice(i, 1);
    atualizarCarrinho();
  };

  window.abrirCarrinho = () => {
    document.getElementById('carrinho').classList.add('aberto');
  };

  window.fecharCarrinho = () => {
    document.getElementById('carrinho').classList.remove('aberto');
  };

  // ======= LÓGICA DE FILTRO =======
  const selectCategoria = document.getElementById('categoria-select');
  const produtos        = document.querySelectorAll('.produto');

  if (selectCategoria) {
    selectCategoria.addEventListener('change', () => {
      const catEscolhida = selectCategoria.value;
      produtos.forEach(prod => {
        const cat = prod.dataset.categoria;
        prod.style.display = 
          catEscolhida === 'todas' || cat === catEscolhida 
            ? '' 
            : 'none';
      });
    });
  }
});
