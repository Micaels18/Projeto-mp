// js/script.js

document.addEventListener('DOMContentLoaded', () => {
  // ======= LÓGICA DO CARRINHO =======
  let carrinho = [];
  let total = 0;

  window.adicionarAoCarrinho = (produto, preco) => {
    carrinho.push({ produto, preco });
    total += preco;
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

      // Monta o payload para o Mercado Pago
      const items = carrinho.map(item => ({
        title:      item.produto,
        unit_price: item.preco,
        quantity:   1
      }));

      try {
        // Remove API_BASE e use rota relativa
        const res = await fetch('/api/create_preference', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ items })
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const { init_point } = await res.json();
        window.location.href = init_point;
      } catch (err) {
        console.error('Erro ao iniciar pagamento:', err);
        alert('Não foi possível iniciar o pagamento. Tente novamente.');
      }
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
});
