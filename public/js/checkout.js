const mp = new MercadoPago('APP_USR-51377fc6-7726-40cc-870a-81197141baf6');

document.getElementById('form-pagamento').onsubmit = async function(e) {
  e.preventDefault();
  const cardNumber = document.getElementById('cardNumber').value;
  const cardExpiration = document.getElementById('cardExpiration').value;
  const cardCvv = document.getElementById('cardCvv').value;
  const cardholderName = document.getElementById('cardholderName').value;
  const email = document.getElementById('email').value;

  // Tokenização
  const [expMonth, expYear] = cardExpiration.split('/');

  try {
    const tokenResponse = await mp.fields.createCardToken({
      cardNumber,
      cardholderName,
      cardExpirationMonth: expMonth,
      cardExpirationYear: '20' + expYear,
      securityCode: cardCvv,
      identificationType: 'CPF',
      identificationNumber: '12345678909' // Exemplo, ideal pedir no form
    });
    const token = tokenResponse.id;

    // Envia para o backend
    const res = await fetch('/api/pagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        email,
        valor: 100 // valor em reais, ajuste conforme seu carrinho
      })
    });
    const data = await res.json();
    document.getElementById('resultado').innerText = JSON.stringify(data, null, 2);
  } catch (err) {
    document.getElementById('resultado').innerText = 'Erro: ' + err.message;
  }
}; 