const mp = new MercadoPago('APP_USR-51377fc6-7726-40cc-870a-81197141baf6');

const stylePadrao = {
  base: {
    color: "#181818",
    fontSize: "1rem",
    backgroundColor: "#fff",
    borderRadius: "5px",
    fontFamily: "Raleway, Arial, sans-serif",
  },
  focus: {
    color: "#FFD700"
  },
  empty: {
    color: "#888"
  }
};

// Monta os campos do Mercado Pago
mp.fields.create('cardNumber', {
  placeholder: 'Número do cartão',
  style: stylePadrao
}).mount('form-checkout__cardNumber');

mp.fields.create('expirationDate', {
  placeholder: 'MM/AA',
  style: stylePadrao
}).mount('form-checkout__expirationDate');

mp.fields.create('securityCode', {
  placeholder: 'CVV',
  style: stylePadrao
}).mount('form-checkout__securityCode');

// Exibe resumo do carrinho
function exibirResumoCarrinho() {
  const resumoDiv = document.getElementById('resumo-carrinho');
  let carrinho = [];
  let total = 0;
  try {
    carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    total = Number(localStorage.getItem('checkout_total')) || 0;
  } catch {
    carrinho = [];
    total = 0;
  }
  if (!carrinho.length || !total) {
    resumoDiv.innerHTML = '<div style="color:#FFD700;font-weight:bold;">Carrinho vazio ou erro ao carregar total. Volte e tente novamente.</div>';
    return;
  }
  let html = '<h2>Resumo do Carrinho</h2><ul>';
  carrinho.forEach(item => {
    html += `<li>${item.produto} — R$ ${item.preco.toFixed(2)}</li>`;
  });
  html += '</ul>';
  html += `<div class='total'>Total: R$ ${total.toFixed(2)}</div>`;
  resumoDiv.innerHTML = html;
}
exibirResumoCarrinho();

// Submissão do formulário
const form = document.getElementById('form-pagamento');
form.onsubmit = async function(e) {
  e.preventDefault();
  try {
    const token = await mp.fields.createCardToken();
    // Pega o e-mail do usuário logado do localStorage
    const email = localStorage.getItem('usuario');
    if (!email) {
      document.getElementById('resultado').innerText = 'Você precisa estar logado para pagar!';
      return;
    }
    const identificationNumber = document.getElementById('form-checkout__identificationNumber').value;
    if (!identificationNumber) {
      document.getElementById('resultado').innerText = 'Preencha o CPF!';
      return;
    }
    let valor = parseFloat(localStorage.getItem('checkout_total'));
    if (!valor || isNaN(valor)) valor = 100;
    const res = await fetch('/api/pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.id,
        email,
        valor,
        identificationNumber
      })
    });
    const data = await res.json();
    if (!res.ok) {
      document.getElementById('resultado').innerText = 'Erro: ' + (data.message || JSON.stringify(data));
      return;
    }
    document.getElementById('resultado').innerText = JSON.stringify(data, null, 2);
  } catch (err) {
    console.log('Erro no pagamento:', err);
    document.getElementById('resultado').innerText = 'Erro inesperado: ' + (err.message || JSON.stringify(err));
  }
}; 